const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const Certificate = require('../models/Certificate');
const { getCaptcha, verifyCertificate } = require('../controllers/certificateController');
const { createChallenge } = require('../utils/captcha');
const originalFind = Certificate.findOne;
const originalSecret = process.env.JWT_SECRET;
afterEach(() => {
  Certificate.findOne = originalFind;
  if (originalSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalSecret;
});
const response = () => ({
  statusCode: 200, headers: {},
  setHeader(key, value) { this.headers[key] = value; },
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; }
});
test('issued CAPTCHA accepts the exact answer and looks up the certificate', async () => {
  process.env.JWT_SECRET = 'certificate-verification-test-secret';
  const challenge = response();
  await getCaptcha({}, challenge);
  assert.equal(challenge.headers['Cache-Control'], 'no-store');
  const { captcha, captchaToken } = challenge.body.data;
  let lookup;
  const record = { certificateId: 'JMDS-TEST', status: 'valid', student: { name: 'Student' }, course: { title: 'Driving', duration: '4 weeks' } };
  Certificate.findOne = filter => {
    lookup = filter;
    return { populate() { return this; }, then(resolve) { return Promise.resolve(record).then(resolve); } };
  };
  const res = response();
  await verifyCertificate({ body: { certificateId: ' JMDS-TEST ', captcha, captchaToken } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.status, 'Valid');
  assert.deepEqual(lookup, { certificateId: 'JMDS-TEST' });
});
test('wrong answers, missing tokens, and tampered tokens fail before any certificate lookup', async () => {
  process.env.JWT_SECRET = 'certificate-verification-test-secret';
  const challenge = response();
  await getCaptcha({}, challenge);
  const { captcha, captchaToken } = challenge.body.data;
  Certificate.findOne = () => assert.fail('Invalid CAPTCHA reached the database');
  for (const body of [
    { captcha: '!!!!!!', captchaToken },
    { captcha, sessionCaptcha: captcha },
    { captcha, captchaToken: `${captchaToken}tampered` }
  ]) {
    const res = response();
    await verifyCertificate({ body: { certificateId: 'JMDS-TEST', ...body } }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.code, 'INVALID_CAPTCHA');
  }
});

test('CAPTCHA rejects changes to letter case before any certificate lookup', async () => {
  process.env.JWT_SECRET = 'certificate-verification-test-secret';
  const captchaToken = createChallenge('AbC123');
  Certificate.findOne = () => assert.fail('Wrong-case CAPTCHA reached the database');
  for (const captcha of ['ABC123', 'abc123', 'aBc123', ' AbC123 ']) {
    const res = response();
    await verifyCertificate({ body: { certificateId: 'JMDS-TEST', captcha, captchaToken } }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.code, 'INVALID_CAPTCHA');
  }
});
