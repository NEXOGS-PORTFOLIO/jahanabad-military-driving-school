const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const User = require('../models/User');
const ReferenceCode = require('../models/ReferenceCode');
const { hashSMSOTP } = require('../utils/smsService');
const delivered = [];
let failure;
process.env.JWT_SECRET = 'delivery-test-secret';
require.cache[require.resolve('../utils/smsService')] = { exports: {
  hashSMSOTP,
  sendSMSOTP: async (...args) => {
    if (failure === 'sms') throw Object.assign(new Error('The SMS service has insufficient balance. Please contact support.'), { code: 'SMS_DELIVERY_FAILED', providerCode: 417 });
    delivered.push(['sms', ...args]);
  }
} };
require.cache[require.resolve('../utils/emailService')] = { exports: {
  sendLoginNotificationEmail: async () => {},
  sendPasswordResetEmail: async () => {},
  sendRegistrationSuccessEmail: async () => {},
  sendOTPEmail: async (...args) => {
    if (failure === 'email') throw new Error('SMTP unavailable');
    delivered.push(['email', ...args]);
  }
} };
const auth = require('../controllers/authController');
const originals = { findOne: User.findOne, create: User.create, findByIdAndDelete: User.findByIdAndDelete, findOneAndUpdate: User.findOneAndUpdate };
const originalReference = ReferenceCode.findOneAndUpdate;
afterEach(() => {
  Object.assign(User, originals);
  ReferenceCode.findOneAndUpdate = originalReference;
  delivered.length = 0;
  failure = undefined;
});
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const body = { name: 'Test Student', email: 'test@example.com', phone: '01712345678', password: 'TestPassword123' };

test('registration sends the same code by email and SMS', async () => {
  User.findOne = async () => null;
  let created;
  User.create = async fields => { created = fields; return { ...fields, _id: 'pending' }; };
  const res = response();
  await auth.register({ body }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(delivered.length, 2);
  assert.equal(created.phone, '+8801712345678');
  assert.equal(created.otp, delivered[1][2]);
  assert.equal(delivered[0][2], delivered[1][2]);
  assert.equal(created.smsOtp, undefined);
  assert.equal(created.isVerified, undefined);
  assert.equal(res.body.token, undefined);
});

test('email failure removes pending registration and releases instructor reference', async () => {
  for (const channel of ['email']) {
    failure = channel;
    User.findOne = async () => null;
    User.create = async fields => ({ ...fields, _id: 'pending' });
    let deleted;
    User.findByIdAndDelete = async id => { deleted = id; };
    const reference = { isUsed: true, usedAt: new Date(), save: async () => {} };
    ReferenceCode.findOneAndUpdate = async () => reference;
    const res = response();
    await auth.register({ body: { ...body, role: 'instructor', referenceCode: 'REF123' } }, res);
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.code, 'VERIFICATION_DELIVERY_FAILED');
    assert.match(res.body.message, channel === 'sms' ? /insufficient balance/ : /verification email/);
    assert.equal(deleted, 'pending');
    assert.equal(reference.isUsed, false);
    assert.equal(reference.usedAt, undefined);
    assert.equal(res.body.token, undefined);
  }
});

test('resend rotates the shared code and never returns a code to the caller', async () => {
  User.findOne = async () => ({ ...body, _id: 'pending', isVerified: false });
  let update;
  User.findOneAndUpdate = async (filter, change) => { update = change.$set; return { _id: 'pending' }; };
  const res = response();
  await auth.resendOTP({ body: { email: body.email } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(delivered.length, 2);
  assert.equal(update.otp, delivered[1][2]);
  assert.equal(delivered[0][2], delivered[1][2]);
  assert.equal(res.body.otp, undefined);
  assert.equal(res.body.smsOtp, undefined);
});


test('SMS failure preserves instructor registration and the email OTP completes verification', async () => {
  failure = 'sms';
  let user;
  User.findOne = async () => null;
  User.create = async fields => { user = { ...fields, _id: 'pending', isVerified: false }; return user; };
  User.findByIdAndDelete = async () => assert.fail('SMS failure must not delete the account');
  const reference = { isUsed: true, save: async () => {} };
  ReferenceCode.findOneAndUpdate = async () => reference;
  const res = response();
  await auth.register({ body: { ...body, role: 'instructor', referenceCode: 'REF123' } }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.smsAccepted, false);
  assert.match(res.body.message, /use the email code/);
  assert.equal(reference.isUsed, true);
  assert.equal(reference.usedBy, 'pending');
  assert.equal(delivered.length, 1);
  assert.equal(delivered[0][0], 'email');
  assert.equal(delivered[0][2], user.otp);
  assert.equal(user.isVerified, false);
  assert.equal(res.body.token, undefined);
  User.findOne = () => ({ select: async () => user });
  User.findOneAndUpdate = async (filter, update) => {
    assert.equal(filter.smsOtpHash, undefined);
    assert.equal(filter.smsOtpExpires, undefined);
    if (update.$set) {
      assert.equal(update.$set.isVerified, true);
      assert.equal(update.$set.phoneVerified, undefined);
    }
    return user;
  };
  const verified = response();
  await auth.verifyOTP({ body: { email: body.email, otp: delivered[0][2] } }, verified);
  assert.equal(verified.statusCode, 200);
});

test('SMS failure during resend still returns a usable new email code', async () => {
  failure = 'sms';
  User.findOne = async () => ({ ...body, _id: 'pending', isVerified: false });
  let update;
  User.findOneAndUpdate = async (filter, change) => { update = change.$set; return { _id: 'pending' }; };
  const res = response();
  await auth.resendOTP({ body: { email: body.email } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.smsAccepted, false);
  assert.equal(delivered.length, 1);
  assert.equal(delivered[0][0], 'email');
  assert.equal(update.otp, delivered[0][2]);
});
