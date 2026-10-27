const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Enrollment = require('../models/Enrollment');
const Certificate = require('../models/Certificate');
let events, enrollment, certificateExists, failSave;
require.cache[require.resolve('../utils/emailService')] = { exports: { sendEnrollmentConfirmationEmail: async () => {} } };
require.cache[require.resolve('../utils/completionNotifications')] = { exports: {
  processCourseCompletionNotification: async () => { assert.equal(enrollment.status, 'completed'); assert.ok(enrollment.completionEmailRequestedAt); events.push('notification'); }
} };
const { updateEnrollmentStatus, updateProgress } = require('../controllers/enrollmentController');
const originals = [Enrollment.findById, Certificate.findOne, Certificate.create];
afterEach(() => { [Enrollment.findById, Certificate.findOne, Certificate.create] = originals; });
const instructor = new mongoose.Types.ObjectId();
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const query = value => ({ populate() { return this; }, then(resolve) { return Promise.resolve(value).then(resolve); } });
const setup = () => {
  events = []; certificateExists = false; failSave = false;
  enrollment = new Enrollment({ student: new mongoose.Types.ObjectId(), course: new mongoose.Types.ObjectId(), instructor, status: 'approved', progress: 50 });
  enrollment.save = async () => { if (failSave) throw new Error('Enrollment save failed'); events.push('completion-saved'); };
  Enrollment.findById = () => query(enrollment);
  Certificate.findOne = async () => certificateExists ? { certificateId: 'existing' } : null;
  Certificate.create = async () => { events.push('certificate-created'); return {}; };
};
const request = body => ({ params: { id: enrollment._id.toString() }, user: { _id: instructor, role: 'instructor', name: 'Instructor' }, body });

test('both manual completion and 100% progress queue notification only after successful persistence', async () => {
  for (const [handler, body] of [[updateEnrollmentStatus, { status: 'completed' }], [updateProgress, { progress: 100 }]]) {
    setup(); const res = response();
    await handler(request(body), res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(events, ['certificate-created', 'completion-saved', 'notification']);
    assert.equal(enrollment.progress, 100);
  }
});

test('failed completion persistence and incomplete progress never trigger notification', async () => {
  setup(); failSave = true;
  const failed = response();
  await updateEnrollmentStatus(request({ status: 'completed' }), failed);
  assert.equal(failed.statusCode, 500);
  assert.ok(!events.includes('notification'));
  setup(); const incomplete = response();
  await updateProgress(request({ progress: 99 }), incomplete);
  assert.equal(incomplete.statusCode, 200);
  assert.equal(enrollment.completionEmailRequestedAt, undefined);
  assert.deepEqual(events, ['completion-saved']);
});

test('repeated completion preserves completion dates and reuses the existing certificate', async () => {
  setup(); certificateExists = true;
  const originalDate = new Date('2026-01-01');
  enrollment.completedAt = originalDate;
  enrollment.completionEmailRequestedAt = originalDate;
  const res = response();
  await updateEnrollmentStatus(request({ status: 'completed' }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(enrollment.completedAt.getTime(), originalDate.getTime());
  assert.equal(enrollment.completionEmailRequestedAt.getTime(), originalDate.getTime());
  assert.ok(!events.includes('certificate-created'));
  const publicData = enrollment.toJSON();
  assert.equal(publicData.completionEmailRequestedAt, undefined);
  assert.equal(publicData.completionEmailAttempts, undefined);
});
