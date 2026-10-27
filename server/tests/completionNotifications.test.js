const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Enrollment = require('../models/Enrollment');
const Certificate = require('../models/Certificate');
const buildEmail = require('../utils/courseCompletionEmail');
let state, certificate, events, pdfFailure, smtpFailure;
require.cache[require.resolve('../utils/certificatePDF')] = { exports: {
  getCertificatePDF: async () => {
    events.push('generate-pdf');
    if (pdfFailure) throw new Error('PDF unavailable');
    certificate.pdfData = Buffer.from('%PDF-test').toString('base64');
    events.push('pdf-persisted');
    return Buffer.from('%PDF-test');
  }
} };
require.cache[require.resolve('../utils/emailService')] = { exports: {
  sendCourseCompletionEmail: async (email, details) => {
    events.push(['email', email, details]);
    if (smtpFailure) throw new Error('SMTP unavailable');
  }
} };
const { processCourseCompletionNotification, startCourseCompletionEmailWorker } = require('../utils/completionNotifications');
const originals = { enrollmentClaim: Enrollment.findOneAndUpdate, enrollmentUpdate: Enrollment.updateOne,
  enrollmentExists: Enrollment.exists, enrollmentFind: Enrollment.find, certificateFind: Certificate.findOne, certificateExists: Certificate.exists,
  clientUrl: process.env.CLIENT_URL };
afterEach(() => {
  Enrollment.findOneAndUpdate = originals.enrollmentClaim;
  Enrollment.updateOne = originals.enrollmentUpdate;
  Enrollment.exists = originals.enrollmentExists;
  Enrollment.find = originals.enrollmentFind;
  Certificate.findOne = originals.certificateFind;
  Certificate.exists = originals.certificateExists;
  if (originals.clientUrl === undefined) delete process.env.CLIENT_URL; else process.env.CLIENT_URL = originals.clientUrl;
});
const query = value => ({ populate() { return this; }, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } });
const setup = () => {
  events = []; pdfFailure = false; smtpFailure = false;
  state = { _id: 'enrollment-1', status: 'completed', progress: 100, completionEmailRequestedAt: new Date(), completionEmailAttempts: 0,
    student: { _id: 'student-1', name: 'Ayesha Rahman', email: 'registered@example.com', role: 'student' }, course: { _id: 'course-1', title: 'Driving Course' } };
  certificate = { _id: 'certificate-1', certificateId: 'JMDS-001', status: 'valid', student: state.student, course: state.course,
    enrollment: { _id: state._id, status: 'completed', progress: 100 } };
  Enrollment.findOneAndUpdate = (filter, update) => {
    assert.equal(filter.status, 'completed');
    assert.equal(filter.progress, 100);
    assert.deepEqual(filter.completionEmailSentAt, { $exists: false });
    const eligible = state.status === 'completed' && state.progress === 100 && state.completionEmailRequestedAt && !state.completionEmailSentAt &&
      (!state.completionEmailClaimExpiresAt || state.completionEmailClaimExpiresAt <= new Date()) &&
      (!state.completionEmailNextAttemptAt || state.completionEmailNextAttemptAt <= new Date());
    if (!eligible) return query(null);
    Object.assign(state, update.$set);
    state.completionEmailAttempts++;
    return query(state);
  };
  Enrollment.updateOne = async (filter, update) => {
    if (filter.completionEmailClaimToken !== state.completionEmailClaimToken) return { modifiedCount: 0 };
    Object.assign(state, update.$set);
    for (const key of Object.keys(update.$unset || {})) delete state[key];
    return { modifiedCount: 1 };
  };
  Enrollment.exists = async () => state.status === 'completed' && state.progress === 100;
  Certificate.findOne = filter => { assert.equal(filter.status, 'valid'); return query(certificate?.status === 'valid' ? certificate : null); };
  Certificate.exists = async () => !!certificate.pdfData && certificate.status === 'valid';
};
const emails = () => events.filter(event => Array.isArray(event) && event[0] === 'email');

test('email is sent to the registered student only after completion and downloadable PDF persistence', async () => {
  setup();
  const result = await processCourseCompletionNotification(state._id);
  assert.equal(result.sent, true);
  assert.deepEqual(events.slice(0, 2), ['generate-pdf', 'pdf-persisted']);
  assert.equal(emails()[0][1], 'registered@example.com');
  assert.equal(emails()[0][2].certificateId, 'JMDS-001');
  assert.ok(state.completionEmailSentAt instanceof Date);
  assert.equal(state.completionEmailClaimToken, undefined);
  assert.equal((await processCourseCompletionNotification(state._id)).sent, false);
  assert.equal(emails().length, 1);
});

test('incomplete, unrequested, revoked, missing, or mismatched certificates cannot produce completion emails', async () => {
  for (const alter of [
    () => { state.status = 'approved'; }, () => { delete state.completionEmailRequestedAt; },
    () => { certificate.status = 'revoked'; }, () => { certificate = null; },
    () => { certificate.enrollment.status = 'approved'; },
    () => { certificate.student = { _id: 'another-student' }; }
  ]) {
    setup(); alter();
    assert.equal((await processCourseCompletionNotification(state._id)).sent, false);
    assert.equal(emails().length, 0);
  }
});

test('PDF and SMTP failures keep notification queued and retry later without undoing course completion', async () => {
  for (const failure of ['pdf', 'smtp']) {
    setup(); pdfFailure = failure === 'pdf'; smtpFailure = failure === 'smtp';
    await processCourseCompletionNotification(state._id);
    assert.equal(state.status, 'completed');
    assert.equal(state.completionEmailSentAt, undefined);
    assert.ok(state.completionEmailNextAttemptAt > new Date());
    assert.equal(state.completionEmailClaimToken, undefined);
    pdfFailure = false; smtpFailure = false;
    state.completionEmailNextAttemptAt = new Date(0);
    assert.equal((await processCourseCompletionNotification(state._id)).sent, true);
    assert.ok(state.completionEmailSentAt);
  }
});

test('concurrent completion handlers cannot send two emails for one enrollment', async () => {
  setup();
  await Promise.all([processCourseCompletionNotification(state._id), processCourseCompletionNotification(state._id)]);
  assert.equal(emails().length, 1);
  assert.equal(state.completionEmailAttempts, 1);
});

test('worker automatically retries persisted delivery failures and stops cleanly', async () => {
  setup();
  const originalInterval = global.setInterval, originalClear = global.clearInterval;
  const originalReady = mongoose.connection.readyState;
  let tick, stopped = false;
  global.setInterval = callback => { tick = callback; return { unref() {} }; };
  global.clearInterval = () => { stopped = true; };
  mongoose.connection.readyState = 1;
  Enrollment.find = () => ({ select() { return this; }, sort() { return this; }, limit() { return this; }, async lean() { return state.completionEmailSentAt ? [] : [{ _id: state._id }]; } });
  try {
    const stop = startCourseCompletionEmailWorker();
    smtpFailure = true;
    await tick();
    assert.equal(state.completionEmailSentAt, undefined);
    assert.ok(state.completionEmailNextAttemptAt > new Date());
    await tick();
    assert.equal(emails().length, 1);
    smtpFailure = false;
    state.completionEmailNextAttemptAt = new Date(0);
    await tick();
    assert.ok(state.completionEmailSentAt);
    await tick();
    assert.equal(emails().length, 2);
    stop();
    assert.equal(stopped, true);
  } finally {
    global.setInterval = originalInterval;
    global.clearInterval = originalClear;
    mongoose.connection.readyState = originalReady;
  }
});

test('professional HTML and text emails include certificate access instructions and escape student data', () => {
  process.env.CLIENT_URL = 'https://school.example/,http://localhost:3000';
  const email = buildEmail({ studentName: '<script>Ayesha</script>', courseName: 'Driving & Road Safety', certificateId: 'JMDS-001', enrollmentId: 'enrollment-1' });
  assert.ok(email.subject.startsWith('কোর্স সম্পন্ন হয়েছে — আপনার সনদ প্রস্তুত | '));
  assert.ok(email.text.includes('কোর্সটি সফলভাবে সম্পন্ন করেছেন'));
  assert.ok(email.text.includes('Driving & Road Safety'));
  assert.ok(email.text.includes('https://school.example/student-dashboard/certificates'));
  assert.ok(email.text.includes('ডাউনলোড (Download) বাটনে ক্লিক করুন'));
  assert.ok(email.text.includes('নিবন্ধিত ইমেইল ঠিকানা'));
  assert.ok(email.message.includes('&lt;script&gt;Ayesha&lt;/script&gt;'));
  assert.ok(!email.message.includes('<script>'));
  assert.ok(email.message.includes('Driving &amp; Road Safety'));
  assert.equal(email.messageId, '<course-completion-enrollment-1@school.example>');
});
