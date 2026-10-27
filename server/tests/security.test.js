const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
require.cache[require.resolve('../utils/emailService')] = { exports: { sendEnrollmentConfirmationEmail: async () => {} } };
const users = require('../controllers/userController');
const enrollments = require('../controllers/enrollmentController');
const apiSafety = require('../middleware/apiSafety');
const authRateLimit = require('../middleware/authRateLimit');
const { createChallenge, verifyChallenge } = require('../utils/captcha');
const originalUserLookup = User.findById;
const originalEnrollmentLookup = Enrollment.findById;
const savedEnv = { ...process.env };
afterEach(() => {
  User.findById = originalUserLookup;
  Enrollment.findById = originalEnrollmentLookup;
  for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key];
  Object.assign(process.env, savedEnv);
});
const response = () => ({
  statusCode: 200, headers: {},
  status(code) { this.statusCode = code; return this; },
  set(key, value) { this.headers[key] = value; return this; },
  json(body) { this.body = body; return this; }
});

test('other users cannot read a private profile; owners and admins can', async () => {
  let reads = 0;
  User.findById = async () => { reads++; return { name: 'Private user' }; };
  const denied = response();
  await users.getUser({ params: { id: 'other' }, user: { _id: 'self', role: 'student' } }, denied);
  assert.equal(denied.statusCode, 403);
  assert.equal(reads, 0);
  for (const user of [{ _id: 'other', role: 'student' }, { _id: 'self', role: 'admin' }]) {
    const res = response();
    await users.getUser({ params: { id: 'other' }, user }, res);
    assert.equal(res.statusCode, 200);
  }
});

test('an instructor can read only assigned enrollments', async () => {
  const record = { student: { _id: 'student' }, instructor: { _id: 'assigned' } };
  const query = { populate() { return this; }, then(resolve) { return Promise.resolve(record).then(resolve); } };
  Enrollment.findById = () => query;
  for (const [id, expected] of [['unassigned', 403], ['assigned', 200]]) {
    const res = response();
    await enrollments.getEnrollment({ params: { id: 'enrollment' }, user: { _id: id, role: 'instructor' } }, res);
    assert.equal(res.statusCode, expected);
  }
});

test('new and explicitly selected user documents never serialize credentials', () => {
  const user = new User({ name: 'Test', email: 'test@example.com', phone: '01700000000',
    password: 'hash', otp: '123456', resetPasswordOtp: '654321', smsOtpHash: 'secret', otpAttempts: 1 });
  const json = JSON.parse(JSON.stringify(user));
  assert.equal(json.name, 'Test');
  for (const field of ['password', 'otp', 'resetPasswordOtp', 'smsOtpHash', 'otpAttempts']) assert(!(field in json));
});

test('certificate captcha requires a signed unexpired challenge and the correct answer', () => {
  process.env.JWT_SECRET = 'captcha-test-secret-that-is-long-enough';
  const token = createChallenge('Ab2345');
  assert(verifyChallenge('Ab2345', token));
  assert(!verifyChallenge('aB2345', token));
  assert(!verifyChallenge('  Ab2345  ', token));
  const mixedCaseToken = createChallenge('AbC123');
  assert(verifyChallenge('AbC123', mixedCaseToken));
  assert(!verifyChallenge('ABC123', mixedCaseToken));
  assert(!verifyChallenge('abc123', mixedCaseToken));
  assert(!verifyChallenge('Ab 2345', token));
  assert(!verifyChallenge('', token));
  assert(!verifyChallenge('WRONG1', token));
  assert(!verifyChallenge('Ab2345', `${token}tampered`));
  assert(!verifyChallenge('Ab2345', undefined));
  const jwt = require('jsonwebtoken');
  const expired = jwt.sign({ nonce: 'test', digest: 'test' }, process.env.JWT_SECRET,
    { audience: 'certificate-captcha', expiresIn: -1 });
  assert(!verifyChallenge('Ab2345', expired));
});

test('API rejects query operators and masks production server errors', () => {
  process.env.NODE_ENV = 'production';
  const rejected = response();
  apiSafety({ query: {}, body: { email: { $ne: null } } }, rejected, () => assert.fail('Invalid lookup accepted'));
  assert.equal(rejected.statusCode, 400);
  const res = response();
  apiSafety({ query: {}, body: { email: 'test@example.com' } }, res, () => {});
  res.status(500).json({ success: false, message: 'Private database details' });
  assert.equal(res.body.message, 'Server Error');
});

test('password guessing and recovery requests are bounded per IP', () => {
  let allowed = 0;
  for (let i = 0; i < 31; i++) {
    const res = response();
    authRateLimit({ ip: 'security-test-client' }, res, () => allowed++);
    if (i === 30) {
      assert.equal(res.statusCode, 429);
      assert(Number(res.headers['Retry-After']) > 0);
    }
  }
  assert.equal(allowed, 30);
});
