const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const Batch = require('../models/Batch');
const sent = [];
let emailFailure = false;
const emailPath = require.resolve('../utils/emailService');
require.cache[emailPath] = { exports: {
  ...require.cache[emailPath]?.exports,
  sendEnrollmentConfirmationEmail: async (...args) => {
    sent.push(args);
    if (emailFailure) throw new Error('SMTP unavailable');
  }
} };
const { createEnrollment } = require('../controllers/enrollmentController');
const originals = [Enrollment.findOne, Enrollment.create, Enrollment.findById, Course.findById, Batch.findById];
afterEach(() => {
  [Enrollment.findOne, Enrollment.create, Enrollment.findById, Course.findById, Batch.findById] = originals;
  sent.length = 0;
  emailFailure = false;
});
const response = () => ({ status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; } });
const req = { user: { _id: 'student', name: 'রহিম', email: 'student@example.com' },
  body: { batch: 'batch', course: 'untrusted-course', email: 'wrong@example.com' } };
function setup() {
  Batch.findById = async () => ({ course: 'actual-course', isPublished: true, status: 'upcoming' });
  Course.findById = async id => {
    assert.equal(id, 'actual-course');
    return { isActive: true, title: 'Light Vehicle Training' };
  };
  Enrollment.findOne = async () => null;
  Enrollment.create = async () => ({ _id: 'enrollment' });
  Enrollment.findById = () => ({ populate() { return this; }, then(resolve) { resolve({ _id: 'enrollment' }); } });
}
test('successful application returns and emails the same personalized confirmation', async () => {
  setup();
  const res = response();
  await createEnrollment(req, res);
  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.body.confirmation, {
    studentName: 'রহিম', courseName: 'Light Vehicle Training',
    greeting: 'প্রিয় রহিম,',
    message: 'আপনি সফলভাবে ‘Light Vehicle Training’ কোর্সটিতে এনরোল করেছেন। পরবর্তী কার্যক্রমের জন্য সরাসরি নিম্নলিখিত ঠিকানায় যোগাযোগ করুন।',
    contactNumber: '01769-564999', address: 'Jahanabad Cantonment, Khan Jahan Ali, Khulna'
  });
  assert.deepEqual(sent, [[req.user.email, res.body.confirmation]]);
});
test('duplicate and failed applications do not send confirmations', async () => {
  setup();
  Enrollment.findOne = async () => ({ _id: 'existing' });
  const duplicate = response();
  await createEnrollment(req, duplicate);
  assert.equal(duplicate.statusCode, 400);
  Enrollment.findOne = async () => null;
  Enrollment.create = async () => { throw new Error('Database failure'); };
  const failed = response();
  await createEnrollment(req, failed);
  assert.equal(failed.statusCode, 500);
  assert.equal(sent.length, 0);
});
test('SMTP failure does not turn a saved enrollment into a failed application', async () => {
  setup();
  emailFailure = true;
  const res = response();
  await createEnrollment(req, res);
  assert.equal(res.statusCode, 201);
  assert.ok(res.body.confirmation);
});
test('database duplicate-key race returns an enrollment conflict instead of a server error', async () => {
  setup();
  Enrollment.create = async () => { throw Object.assign(new Error('Duplicate'), { code: 11000 }); };
  const res = response();
  await createEnrollment(req, res);
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.code, 'ALREADY_ENROLLED');
  assert.equal(sent.length, 0);
});
