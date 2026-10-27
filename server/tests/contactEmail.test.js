const { test } = require('node:test');
const assert = require('node:assert/strict');
const transportPath = require.resolve('../utils/mailTransport');
let mail;
let reject = false;
require.cache[transportPath] = { exports: {
  getMailTransport: () => ({ sender: 'authenticated@jmdschool.com', transport: { sendMail: async options => {
    mail = options;
    return { accepted: reject ? [] : ['info@jmdschool.com'], rejected: reject ? ['info@jmdschool.com'] : [], messageId: 'test' };
  } } }),
  deliveryError: error => error
} };
const { sendContactEmail } = require('../utils/emailService');
const contact = { name: 'Jane Doe', email: 'jane@example.com', phone: '+8801712345678', message: 'Hello <script>alert(1)</script>\nSecond line' };

test('contact mail uses fixed recipient, authenticated sender, reply-to and the branded escaped template', async () => {
  await sendContactEmail({ ...contact, emailRecipient: 'attacker@example.com' });
  assert.equal(mail.to, 'info@jmdschool.com');
  assert.equal(mail.from.address, 'authenticated@jmdschool.com');
  assert.equal(mail.replyTo, contact.email);
  assert.equal(mail.subject, 'New Contact Form Submission | JMDS');
  for (const value of ['Jane Doe', 'jane@example.com', '+8801712345678', 'Message', 'Jahanabad Military Driving School']) assert.ok(mail.html.includes(value));
  assert.ok(mail.html.includes('&lt;script&gt;'));
  assert.ok(!mail.html.includes('<script>'));
  assert.ok(mail.text.includes(contact.message));
});

test('SMTP recipient rejection fails the contact email', async () => {
  reject = true;
  try { await assert.rejects(sendContactEmail(contact), { code: 'EMAIL_RECIPIENT_REJECTED' }); }
  finally { reject = false; }
});
