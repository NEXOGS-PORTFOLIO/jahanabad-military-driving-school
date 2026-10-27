const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { validateContact, normalizeContact } = require('../utils/contactValidation');
const Contact = require('../models/Contact');
const { escapeHtml } = require('../utils/escapeHtml');
const limit = require('../middleware/contactRateLimit');
const emailPath = require.resolve('../utils/emailService');
let emailFailure = false;
const emailed = [];
require.cache[emailPath] = { id: emailPath, filename: emailPath, loaded: true, exports: { sendContactEmail: async data => {
  emailed.push(data);
  if (emailFailure) throw new Error('private SMTP credentials');
} } };
const { submitContactForm } = require('../controllers/contactController');
const valid = { name: 'Jane Doe', email: 'Jane+contact@example.technology', phone: '01712-345678', message: 'Please tell me about your driving courses.' };
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; }, set(key, value) { this[key] = value; } });

test('frontend and backend use the same contact rules', () => {
  assert.equal(fs.readFileSync(path.join(__dirname, '../utils/contactValidation.js'), 'utf8'), fs.readFileSync(path.join(__dirname, '../../client/src/utils/contactValidation.js'), 'utf8'));
});

test('validates Unicode names, email aliases, required phones, bounds and malicious types', () => {
  assert.deepEqual(validateContact(valid), {});
  assert.deepEqual(validateContact({ ...valid, name: 'আলফাত হাসান', phone: '০১৭১২৩৪৫৬৭৮' }), {});
  assert.equal(normalizeContact(valid).phone, '+8801712345678');
  assert.equal(normalizeContact({ ...valid, phone: '০১৭১২৩৪৫৬৭৮' }).phone, '+8801712345678');
  assert.ok(validateContact({ ...valid, phone: '' }).phone);
  assert.ok(validateContact({ ...valid, phone: '   ' }).phone);
  assert.ok(validateContact({ ...valid, phone: undefined }).phone);
  assert.ok(new Contact({ ...valid, phone: '' }).validateSync());
  assert.ok(validateContact({ ...valid, name: 'Jo' }).name);
  for (const email of ['x@', 'x..y@example.com', 'x@-example.com', 'x@example..com', 'x@example.com\r\nBcc:spam@example.com']) assert.ok(validateContact({ ...valid, email }).email);
  for (const phone of ['01212345678', '017123', '+88017123456789', '01712345678 ext 3']) assert.ok(validateContact({ ...valid, phone }).phone);
  for (const field of ['name', 'email', 'phone', 'message']) {
    assert.ok(validateContact({ ...valid, [field]: { $ne: null } })[field]);
    assert.ok(validateContact({ ...valid, [field]: null })[field]);
  }
  assert.ok(validateContact({ ...valid, name: ' ' }).name);
  assert.ok(validateContact({ ...valid, name: '---' }).name);
  assert.ok(validateContact({ ...valid, name: 'a'.repeat(101) }).name);
  assert.deepEqual(validateContact({ ...valid, message: 'Hi' }), {});
  assert.deepEqual(validateContact({ ...valid, message: 'a'.repeat(2001) }), {});
  assert.ok(validateContact({ ...valid, message: ' ' }).message);
  assert.deepEqual(validateContact({ ...valid, message: 'a'.repeat(2000) }), {});
  assert.equal(new Contact(normalizeContact(valid)).validateSync(), undefined);
  assert.equal(new Contact({ ...valid, message: 'Hi' }).validateSync(), undefined);
});

test('rejects invalid submissions before persistence, normalizes valid data and hides failures', async () => {
  const original = Contact.create;
  const saved = [];
  Contact.create = async data => { saved.push(data); return { _id: 'id' }; };
  try {
    for (const body of [{ ...valid, email: { $ne: null } }, { ...valid, message: '' }, { ...valid, status: 'replied' }, [], null]) {
      const res = response();
      await submitContactForm({ body }, res);
      assert.equal(res.statusCode, 400);
    }
    assert.equal(saved.length, 0);
    const res = response();
    await submitContactForm({ body: valid }, res);
    assert.equal(res.statusCode, 201);
    assert.deepEqual(saved[0], normalizeContact(valid));
    assert.deepEqual(res.body.data, { id: 'id' });
    assert.deepEqual(emailed.at(-1), normalizeContact(valid));
    Contact.create = async () => { throw new Error('secret database credentials'); };
    const failed = response();
    await submitContactForm({ body: valid }, failed);
    assert.equal(failed.statusCode, 500);
    assert.ok(!failed.body.message.includes('secret'));
  } finally { Contact.create = original; }
});

test('email delivery failure returns an error instead of claiming success and preserves the submission', async () => {
  const original = Contact.create;
  let stored;
  Contact.create = async data => { stored = data; return { _id: 'saved' }; };
  emailFailure = true;
  try {
    const res = response();
    await submitContactForm({ body: valid }, res);
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'CONTACT_EMAIL_FAILED');
    assert.match(res.body.message, /saved/);
    assert.ok(!res.body.message.includes('credentials'));
    assert.deepEqual(stored, normalizeContact(valid));
  } finally { Contact.create = original; emailFailure = false; }
});

test('escapes email HTML and limits repeated submissions per IP', () => {
  assert.equal(escapeHtml('<script>"x" & \'y\'</script>'), '&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;');
  let allowed = 0;
  const res = response();
  for (let i = 0; i < 6; i++) limit({ ip: '192.0.2.90' }, res, () => allowed++);
  assert.equal(allowed, 5);
  assert.equal(res.statusCode, 429);
  assert.ok(Number(res['Retry-After']) > 0);
  limit({ ip: '192.0.2.91' }, res, () => allowed++);
  assert.equal(allowed, 6);
});
