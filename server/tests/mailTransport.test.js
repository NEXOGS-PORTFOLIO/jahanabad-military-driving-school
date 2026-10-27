const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const nodemailer = require('nodemailer');
const savedEnv = { ...process.env };
let transports, messages, nextError, rejectRecipient;
nodemailer.createTransport = options => {
  const entry = { options, closed: false };
  transports.push(entry);
  return { close() { entry.closed = true; }, async verify() { if (nextError) throw nextError; }, async sendMail(message) {
    if (nextError) throw nextError;
    messages.push(message);
    return { messageId: 'test-id', accepted: rejectRecipient ? [] : [message.to], rejected: rejectRecipient ? [message.to] : [] };
  } };
};
const { verifyEmailConnection, closeEmailConnection } = require('../utils/mailTransport');
const email = require('../utils/emailService');
beforeEach(() => {
  transports = []; messages = []; nextError = null; rejectRecipient = false;
  Object.assign(process.env, { EMAIL_HOST: 'mail.school.example', EMAIL_PORT: '465', EMAIL_USER: 'info@school.example', EMAIL_PASS: 'test-only-password' });
  delete process.env.EMAIL_FROM;
});
afterEach(() => {
  closeEmailConnection();
  for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key];
  Object.assign(process.env, savedEnv);
});
const message = { email: 'student@example.com', subject: 'Test', message: '<p>Test</p>', text: 'Test' };

test('mail configuration is read after initialization and all messages share a bounded SMTP pool', async () => {
  assert.equal(transports.length, 0);
  await email.sendEmail(message);
  await email.sendEmail(message);
  assert.equal(transports.length, 1);
  assert.equal(transports[0].options.secure, true);
  assert.equal(transports[0].options.pool, true);
  assert.equal(transports[0].options.connectionTimeout, 15000);
  assert.deepEqual(messages[0].from, { name: 'Jahanabad Military Driving School', address: 'info@school.example' });
});

test('port 587 uses STARTTLS and credential changes replace the previous transport', async () => {
  process.env.EMAIL_PORT = '587';
  await email.sendEmail(message);
  assert.equal(transports[0].options.secure, false);
  assert.equal(transports[0].options.requireTLS, true);
  process.env.EMAIL_PASS = 'new-test-password';
  await email.sendEmail(message);
  assert.equal(transports.length, 2);
  assert.equal(transports[0].closed, true);
});

test('missing credentials, invalid ports, and invalid sender addresses fail clearly before connection', async () => {
  for (const [key, value] of [['EMAIL_PASS', ''], ['EMAIL_PORT', 'invalid'], ['EMAIL_FROM', 'invalid']]) {
    const previous = process.env[key]; process.env[key] = value;
    await assert.rejects(email.sendEmail(message), { code: 'EMAIL_CONFIG_INVALID' });
    if (previous === undefined) delete process.env[key]; else process.env[key] = previous;
  }
  assert.equal(transports.length, 0);
});

test('authentication and connection errors retain actionable codes without exposing provider secrets', async () => {
  nextError = Object.assign(new Error('provider error SECRET_PASSWORD'), { code: 'EAUTH', responseCode: 535, command: 'AUTH PLAIN' });
  await assert.rejects(email.sendEmail(message), error => error.code === 'EMAIL_AUTH_FAILED' && !error.message.includes('SECRET_PASSWORD'));
  nextError = Object.assign(new Error('Timed out'), { code: 'ETIMEDOUT' });
  await assert.rejects(verifyEmailConnection(), { code: 'EMAIL_CONNECTION_FAILED' });
});

test('an explicitly rejected SMTP recipient is never reported as a successful send', async () => {
  rejectRecipient = true;
  await assert.rejects(email.sendEmail(message), { code: 'EMAIL_RECIPIENT_REJECTED' });
});
