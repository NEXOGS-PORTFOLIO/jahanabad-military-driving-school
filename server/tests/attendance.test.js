const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Enrollment = require('../models/Enrollment');
require.cache[require.resolve('../utils/emailService')] = { exports: { sendEnrollmentConfirmationEmail: async () => {} } };
const { markAttendance, bulkMarkAttendance } = require('../controllers/enrollmentController');
const { attendanceDay } = require('../utils/attendance');
const original = Enrollment.findById;
afterEach(() => { Enrollment.findById = original; });
const instructorId = new mongoose.Types.ObjectId();
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const enrollment = () => new Enrollment({ student: new mongoose.Types.ObjectId(), course: new mongoose.Types.ObjectId(), instructor: instructorId,
  attendance: [{ date: '2026-01-01', status: 'present', markedBy: instructorId }, { date: '2026-01-01', status: 'absent', markedBy: instructorId }, { date: '2026-01-02', status: 'present', markedBy: instructorId }] });

test('correcting attendance updates the selected day and repeated saves do not create duplicates', async () => {
  const record = enrollment();
  const existingId = record.attendance[1]._id.toString();
  record.save = async () => {};
  Enrollment.findById = async () => record;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = response();
    await markAttendance({ user: { role: 'instructor', _id: instructorId }, params: { id: record._id.toString() }, body: { date: '2026-01-01', status: 'late' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(record.attendance.length, 2);
    const saved = record.attendance.find(item => attendanceDay(item.date) === '2026-01-01');
    assert.equal(saved.status, 'late');
    assert.equal(saved._id.toString(), existingId);
    assert.equal(record.attendance.find(item => attendanceDay(item.date) === '2026-01-02').status, 'present');
  }
});

test('bulk attendance returns actual saved statuses and reports unauthorized records individually', async () => {
  const allowed = enrollment(), denied = enrollment();
  denied.instructor = new mongoose.Types.ObjectId();
  allowed.save = async () => {};
  denied.save = () => assert.fail('Unauthorized enrollment must not be saved');
  Enrollment.findById = async id => id === allowed._id.toString() ? allowed : denied;
  const res = response();
  await bulkMarkAttendance({ user: { role: 'instructor', _id: instructorId }, body: { attendance: [
    { enrollmentId: allowed._id.toString(), date: '2026-01-01', status: 'absent' },
    { enrollmentId: denied._id.toString(), date: '2026-01-01', status: 'late' }
  ] } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data[0].success, true);
  assert.equal(res.body.data[0].attendance.status, 'absent');
  assert.equal(res.body.data[1].success, false);
  assert.equal(allowed.attendance.length, 2);
  assert.equal(denied.attendance.length, 3);
});

test('invalid attendance arrays, dates, statuses, and enrollment IDs cannot write records', async () => {
  Enrollment.findById = () => assert.fail('Invalid attendance must be rejected before database access');
  const id = new mongoose.Types.ObjectId().toString();
  for (const attendance of [undefined, [], {}, [{ enrollmentId: id, date: '2026-02-30', status: 'present' }],
    [{ enrollmentId: id, date: '2026-01-01', status: 'unknown' }], [{ enrollmentId: 'invalid', date: '2026-01-01', status: 'present' }],
    [{ enrollmentId: id, date: '2099-01-01', status: 'present' }]]) {
    const res = response();
    await bulkMarkAttendance({ body: { attendance } }, res);
    assert.equal(res.statusCode, 400);
  }
  assert.equal(attendanceDay('2026-01-01T20:00:00Z'), '2026-01-02');
});
