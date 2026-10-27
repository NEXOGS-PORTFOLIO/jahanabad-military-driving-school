const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const User = require('../models/User');
const confirmations = [];
process.env.JWT_SECRET = 'registration-test-secret';
const { hashSMSOTP } = require('../utils/smsService');
const smsFields = () => ({ phone: '+8801712345678', smsOtpHash: hashSMSOTP('+8801712345678', '123456'), smsOtpExpires: new Date(Date.now() + 60000) });

// Keep regression tests isolated from SMTP and the configured database.
require.cache[require.resolve('../utils/emailService')] = {
  exports: {
    sendOTPEmail: async () => {},
    sendLoginNotificationEmail: async () => {},
    sendPasswordResetEmail: async () => {},
    sendRegistrationSuccessEmail: async (...args) => { confirmations.push(args); }
  }
};
const auth = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const originalFindOne = User.findOne;
const originalFindById = User.findById;
const originalFindOneAndUpdate = User.findOneAndUpdate;
afterEach(() => {
  User.findOne = originalFindOne;
  User.findById = originalFindById;
  User.findOneAndUpdate = originalFindOneAndUpdate;
  confirmations.length = 0;
});

const response = () => ({
  statusCode: 200,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; }
});
const queryUser = user => {
  User.findOne = () => ({ select: async () => user });
  User.findById = () => ({ select: async () => user });
};

test('student profile updates persist certificate gender and father name', async () => {
  const user = { role: 'student', name: 'Student', email: 'student@example.com', gender: 'male', save: async () => {} };
  User.findById = async () => user;
  const res = response();
  await auth.updateMe({ user: { _id: 'student' }, body: { gender: 'female', fatherName: '  Father Name  ' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(user.gender, 'female');
  assert.equal(user.fatherName, 'Father Name');
});

test('invalid gender is rejected before updating a profile', async () => {
  User.findById = () => assert.fail('Invalid gender must be rejected before database access');
  const res = response();
  await auth.updateMe({ user: { _id: 'student' }, body: { gender: 'invalid' } }, res);
  assert.equal(res.statusCode, 400);
});

test('missing or invalid authentication is tagged for session expiry handling', async () => {
  for (const headers of [{}, { authorization: 'Bearer invalid-token' }]) {
    const res = response();
    await protect({ headers }, res, () => assert.fail('Must not authorize'));
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.code, 'AUTH_REQUIRED');
  }
});

test('public registration rejects admin and unknown roles before database access', async () => {
  User.findOne = () => { throw new Error('Database must not be accessed'); };
  for (const role of ['admin', 'owner', null]) {
    const res = response();
    await auth.register({ body: { role } }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'Invalid registration role');
  }
});

test('email verification rejects absent and malformed OTP input', async () => {
  User.findOne = () => { throw new Error('Database must not be accessed'); };
  for (const otp of [undefined, '', {}, '123', 123456]) {
    const res = response();
    await auth.verifyOTP({ body: { email: 'test@example.com', otp } }, res);
    assert.equal(res.statusCode, 400);
  }
});

test('email verification requires a stored OTP and a future expiry', async () => {
  for (const fields of [
    {},
    { otp: '123456' },
    { otp: '123456', otpExpires: new Date(0) },
    { otp: '123456', otpExpires: 'invalid' }
  ]) {
    queryUser({ ...smsFields(), isVerified: false, ...fields, save() { assert.fail('Must not verify'); } });
    const res = response();
    await auth.verifyOTP({ body: { email: 'test@example.com', otp: '123456' } }, res);
    assert.equal(res.statusCode, 400);
  }
});

test('one shared code activates the account and is consumed', async () => {
  const user = { ...smsFields(), otp: '123456', otpExpires: new Date(Date.now() + 60000) };
  User.findOneAndUpdate = async (filter, update) => {
    assert.equal(filter.isVerified, false);
    assert.equal(filter.otp, '123456');
    if (update.$inc) return user;
    assert.ok(filter.otpExpires.$gt instanceof Date);
    assert.deepEqual(update.$set, { isVerified: true, status: 'active' });
    assert.deepEqual(update.$unset, { otp: '', otpExpires: '', smsOtpHash: '', smsOtpExpires: '', otpAttempts: '', otpSentAt: '' });
    return user;
  };
  queryUser(user);
  const res = response();
  await auth.verifyOTP({ body: { email: 'test@example.com', otp: '123456' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(confirmations.length, 0);
});

test('student verification returns a session and sends confirmation only once', async () => {
  const previousSecret = process.env.JWT_SECRET;
  const previousExpiry = process.env.JWT_EXPIRE;
  process.env.JWT_SECRET = 'registration-test-secret';
  process.env.JWT_EXPIRE = '1d';
  try {
    const user = { ...smsFields(), _id: 'student-id', name: 'রহিম', email: 'student@example.com', role: 'student',
      otp: '123456', otpExpires: new Date(Date.now() + 60000) };
    queryUser(user);
    let consumed = false;
    User.findOneAndUpdate = async (filter, update) => {
      if (update.$inc) return user;
      if (consumed) return null;
      consumed = true;
      return user;
    };
    const req = { body: { email: user.email, otp: user.otp } };
    const first = response();
    await auth.verifyOTP(req, first);
    assert.equal(first.statusCode, 200);
    assert.ok(first.body.token);
    assert.equal(first.body.user.name, user.name);
    assert.equal(first.body.user.otp, undefined);
    const second = response();
    await auth.verifyOTP(req, second);
    assert.equal(second.statusCode, 400);
    assert.deepEqual(confirmations, [[user.email, user.name]]);
  } finally {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
    if (previousExpiry === undefined) delete process.env.JWT_EXPIRE;
    else process.env.JWT_EXPIRE = previousExpiry;
  }
});

test('unverified login checks the password before revealing verification state', async () => {
  queryUser({ isVerified: false, comparePassword: async () => false });
  const res = response();
  await auth.login({ body: { email: 'test@example.com', password: 'wrong-password' } }, res);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, 'Invalid credentials');
  assert.equal(res.body.isUnverified, undefined);
});

test('correct password on an unverified account preserves the verification prompt', async () => {
  queryUser({ isVerified: false, email: 'test@example.com', comparePassword: async () => true });
  const res = response();
  await auth.login({ body: { email: 'test@example.com', password: 'correct-password' } }, res);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.isUnverified, true);
});

test('password change uses the model password comparison method and saves', async () => {
  let saved = false;
  const user = {
    comparePassword: async value => value === 'old-password',
    save: async () => { saved = true; }
  };
  queryUser(user);
  const res = response();
  await auth.changePassword({ user: { _id: 'test' }, body: { currentPassword: 'old-password', newPassword: 'new-password' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(user.password, 'new-password');
  assert.equal(saved, true);
});

test('wrong current password cannot save a new password', async () => {
  queryUser({ comparePassword: async () => false, save() { assert.fail('Must not save'); } });
  const res = response();
  await auth.changePassword({ user: { _id: 'test' }, body: { currentPassword: 'wrong-password', newPassword: 'new-password' } }, res);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.code, undefined);
});

test('password change validates missing and short passwords before querying', async () => {
  User.findById = () => { throw new Error('Database must not be accessed'); };
  for (const body of [{}, { currentPassword: 'old-password', newPassword: 'short' }, { currentPassword: {}, newPassword: 'new-password' }]) {
    const res = response();
    await auth.changePassword({ body }, res);
    assert.equal(res.statusCode, 400);
  }
});

test('password reset requires an expiry for both verification and reset', async () => {
  queryUser({ resetPasswordOtp: '123456', save() { assert.fail('Must not save'); } });
  for (const handler of [auth.verifyResetOTP, auth.resetPassword]) {
    const res = response();
    await handler({ body: { email: 'test@example.com', otp: '123456', newPassword: 'new-password' } }, res);
    assert.equal(res.statusCode, 400);
  }
});


test('missing code cannot complete registration', async () => {
  User.findOne = () => assert.fail('Must reject before database access');
  const res = response();
  await auth.verifyOTP({ body: { email: 'test@example.com' } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.token, undefined);
});

test('wrong code, expired code and exhausted attempts cannot activate an account', async () => {
  for (const scenario of ['wrong', 'expired', 'locked']) {
    const user = { ...smsFields(), otp: '123456', otpExpires: new Date(Date.now() + 60000) };
    if (scenario === 'expired') user.otpExpires = new Date(0);
    queryUser(user);
    User.findOneAndUpdate = async (filter, update) => {
      assert.ok(update.$inc, 'Must never activate the account');
      assert.equal(filter.$or[0].otpAttempts.$lt, 5);
      return scenario === 'locked' ? null : user;
    };
    const res = response();
    await auth.verifyOTP({ body: { email: 'test@example.com', otp: '000000' } }, res);
    assert.equal(res.statusCode, scenario === 'locked' ? 429 : 400);
    assert.equal(res.body.token, undefined);
    assert.equal(confirmations.length, 0);
  }
});

test('resend reserves cooldown atomically before any delivery', async () => {
  User.findOne = async () => ({ _id: 'pending', phone: '01712345678', isVerified: false });
  User.findOneAndUpdate = async (filter, update) => {
    assert.equal(filter.isVerified, false);
    assert.ok(filter.$or[0].otpSentAt.$lte instanceof Date);
    assert.equal(update.$set.otpAttempts, 0);
    return null;
  };
  const res = response();
  await auth.resendOTP({ body: { email: 'test@example.com' } }, res);
  assert.equal(res.statusCode, 429);
});
