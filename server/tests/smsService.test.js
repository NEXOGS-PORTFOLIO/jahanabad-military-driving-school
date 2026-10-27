const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { normalizePhone } = require('../utils/phone');
const { sendSMSOTP, hashSMSOTP } = require('../utils/smsService');
const originalFetch = global.fetch;
const keys = ['SMS_BD_API_KEY', 'SMS_BD_SENDER_ID', 'JWT_SECRET'];
const originalEnv = Object.fromEntries(keys.map(key => [key, process.env[key]]));
afterEach(() => {
  global.fetch = originalFetch;
  for (const key of keys) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});
const configure = () => {
  process.env.SMS_BD_API_KEY = 'test-api-key';
  delete process.env.SMS_BD_SENDER_ID;
};

test('normalizes supported Bangladesh numbers and rejects invalid input', () => {
  for (const phone of ['01712345678', '8801712345678', '+8801712345678', '01712-345678']) {
    assert.equal(normalizePhone(phone), '+8801712345678');
  }
  for (const phone of [null, {}, 1712345678, '01212345678', '+15551234567', '017123456789']) {
    assert.equal(normalizePhone(phone), null);
  }
});

test('SMS.BD receives the API key, normalized recipient and shared registration code in JSON', async () => {
  configure();
  let payload;
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://api.sms.net.bd/sendsms');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers['Content-Type'], 'application/json');
    assert.equal(options.redirect, 'error');
    payload = JSON.parse(options.body);
    assert.ok(options.signal);
    return { ok: true, json: async () => ({ error: 0, data: { request_id: 123 } }) };
  };
  await sendSMSOTP('01712345678', '654321');
  assert.equal(payload.api_key, 'test-api-key');
  assert.equal(payload.to, '8801712345678');
  assert.equal(payload.sender_id, undefined);
  assert.match(payload.msg, /654321/);
});

test('supports an optional approved sender ID', async () => {
  configure();
  process.env.SMS_BD_SENDER_ID = 'ApprovedSender';
  let payload;
  global.fetch = async (url, options) => {
    payload = JSON.parse(options.body);
    return { ok: true, json: async () => ({ error: 0 }) };
  };
  await sendSMSOTP('+8801712345678', '654321');
  assert.equal(payload.sender_id, 'ApprovedSender');
  assert.equal(payload.to, '8801712345678');
});

test('missing configuration and invalid recipients never call SMS.BD', async () => {
  global.fetch = () => assert.fail('Must not call provider');
  delete process.env.SMS_BD_API_KEY;
  await assert.rejects(sendSMSOTP('01712345678', '654321'), /not configured/);
  process.env.SMS_BD_API_KEY = '   ';
  await assert.rejects(sendSMSOTP('01712345678', '654321'), /not configured/);
  configure();
  await assert.rejects(sendSMSOTP('invalid', '654321'), /Invalid Bangladesh/);
});

test('HTTP and provider errors, malformed responses and timeouts fail without exposing provider details', async () => {
  configure();
  for (const [ok, result] of [[false, { error: 0 }], [true, { error: 1, msg: 'secret details' }],
    [true, {}], [true, null], [true, { error: false }]]) {
    global.fetch = async () => ({ ok, json: async () => result });
    await assert.rejects(sendSMSOTP('01712345678', '654321'), { message: 'Unable to send verification SMS. Please try again.' });
  }
  global.fetch = async () => ({ ok: true, json: async () => { throw new SyntaxError('invalid JSON'); } });
  await assert.rejects(sendSMSOTP('01712345678', '654321'), /Unable to send verification SMS/);
  global.fetch = async () => { throw new Error('secret provider details'); };
  await assert.rejects(sendSMSOTP('01712345678', '654321'), { message: 'Unable to send verification SMS. Please try again.' });
});

test('stored SMS hash is bound to the phone and server secret', () => {
  process.env.JWT_SECRET = 'test-secret';
  const hash = hashSMSOTP('+8801712345678', '654321');
  assert.equal(hash.length, 64);
  assert.notEqual(hash, hashSMSOTP('+8801812345678', '654321'));
  assert.notEqual(hash, hashSMSOTP('+8801712345678', '123456'));
});


test('provider rejections preserve safe actionable diagnostics', async () => {
  configure();
  for (const [code, message] of [[417, /insufficient balance/], [413, /sender ID/], [420, /blocked/], [405, /authentication failed/]]) {
    global.fetch = async () => ({ ok: true, status: 200, json: async () => ({ error: code, msg: 'secret API key and recipient' }) });
    await assert.rejects(sendSMSOTP('01712345678', '654321'), error => {
      assert.equal(error.code, 'SMS_DELIVERY_FAILED');
      assert.equal(error.statusCode, 503);
      assert.equal(error.providerCode, code);
      assert.match(error.message, message);
      assert.doesNotMatch(error.message, /secret/);
      return true;
    });
  }
});

test('accepts a string zero success code without accepting other falsy values', async () => {
  configure();
  global.fetch = async () => ({ ok: true, json: async () => ({ error: '0' }) });
  await sendSMSOTP('01712345678', '654321');
});
