const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Enrollment = require('../models/Enrollment');
const { updateProgress } = require('../controllers/enrollmentController');
const originalFindById = Enrollment.findById;
afterEach(() => { Enrollment.findById = originalFindById; });
const instructorId = new mongoose.Types.ObjectId();
const studentId = new mongoose.Types.ObjectId();
const response = () => ({
  statusCode: 200,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; }
});
const request = body => ({
  params: { id: new mongoose.Types.ObjectId().toString() },
  user: { _id: instructorId, name: 'Instructor Karim', role: 'instructor' },
  body
});

test('assigned instructor adds persistent attributed history without replacing earlier comments', async () => {
  const enrollment = new Enrollment({ student: studentId, course: new mongoose.Types.ObjectId(), instructor: instructorId });
  let saved;
  enrollment.save = async () => { await enrollment.validate(); saved = enrollment.toObject(); };
  Enrollment.findById = () => ({ populate() { return this; }, then(resolve) { resolve(enrollment); } });
  for (const comment of ['  Needs more parking practice.  ', 'Parking has improved.']) {
    const res = response();
    await updateProgress(request({ progress: '60', comment, authorName: 'Forged author' }), res);
    assert.equal(res.statusCode, 200);
  }
  const reloaded = Enrollment.hydrate(saved);
  assert.equal(reloaded.progressComments.length, 2);
  assert.equal(reloaded.progressComments[0].text, 'Needs more parking practice.');
  assert.equal(reloaded.progressComments[1].authorName, 'Instructor Karim');
  assert.equal(reloaded.progressComments[1].author.toString(), instructorId.toString());
  assert.equal(reloaded.progressComments[1].progress, 60);
  assert.ok(reloaded.progressComments[1].createdAt instanceof Date);
});

test('legacy enrollments support progress updates without a comment', async () => {
  const enrollment = Enrollment.hydrate({ _id: new mongoose.Types.ObjectId(), student: studentId, course: new mongoose.Types.ObjectId(), instructor: instructorId });
  enrollment.save = async () => {};
  Enrollment.findById = () => ({ populate() { return this; }, then(resolve) { resolve(enrollment); } });
  const res = response();
  await updateProgress(request({ progress: 50, comment: '   ' }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(enrollment.progressComments.length, 0);
});

test('unassigned instructor cannot append a comment or change progress', async () => {
  const enrollment = new Enrollment({ student: studentId, course: new mongoose.Types.ObjectId(), instructor: new mongoose.Types.ObjectId(), progress: 20 });
  Enrollment.findById = async () => enrollment;
  const res = response();
  await updateProgress(request({ progress: 60, comment: 'Unauthorized comment' }), res);
  assert.equal(res.statusCode, 403);
  assert.equal(enrollment.progress, 20);
  assert.equal(enrollment.progressComments.length, 0);
});

test('invalid comments and progress are rejected before database writes', async () => {
  Enrollment.findById = () => assert.fail('Invalid input must not reach database');
  for (const body of [
    { progress: 50, comment: 'x'.repeat(2001) },
    { progress: 50, comment: {} },
    { progress: -1 }, { progress: 101 }, { progress: '' }, { progress: null }, { progress: 'invalid' }
  ]) {
    const res = response();
    await updateProgress(request(body), res);
    assert.equal(res.statusCode, 400);
  }
});
