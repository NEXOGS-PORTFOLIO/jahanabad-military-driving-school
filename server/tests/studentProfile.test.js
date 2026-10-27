const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const User = require('../models/User');
const controller = require('../controllers/studentProfileController');
const { authorize } = require('../middleware/auth');
const originalFindOne = User.findOne;
const Enrollment = require('../models/Enrollment');
const originalEnrollmentFind = Enrollment.findById;
const originalUpdate = User.findOneAndUpdate;
afterEach(() => { User.findOne = originalFindOne; Enrollment.findById = originalEnrollmentFind; User.findOneAndUpdate = originalUpdate; });
const id = '507f1f77bcf86cd799439011';
const response = () => ({
  statusCode: 200, headers: {},
  status(code) { this.statusCode = code; return this; },
  set(key, value) { if (typeof key === 'object') Object.assign(this.headers, key); else this.headers[key] = value; return this; },
  json(body) { this.body = body; return this; },
  send(body) { this.body = body; return this; }
});

test('enrollment upload updates only provided documents on the enrolled student', async () => {
  Enrollment.findById = enrollmentId => {
    assert.equal(enrollmentId, id);
    return { select: async () => ({ student: id }) };
  };
  const bytes = Buffer.from('%PDF-1.7');
  User.findOneAndUpdate = async (query, update) => {
    assert.deepEqual(query, { _id: id, role: 'student' });
    assert.deepEqual(update, { $set: { nidDocument: { filename: 'nid.pdf', contentType: 'application/pdf', data: bytes } } });
    return { _id: id };
  };
  const res = response();
  await controller.uploadEnrollmentDocuments({ params: { id }, files: { nidDocument: [{ originalname: 'nid.pdf', mimetype: 'application/pdf', buffer: bytes }] } }, res);
  assert.equal(res.body.success, true);
});

test('enrollment upload rejects empty uploads and missing enrollments', async () => {
  const empty = response();
  await controller.uploadEnrollmentDocuments({ params: { id }, files: {} }, empty);
  assert.equal(empty.statusCode, 400);
  Enrollment.findById = () => ({ select: async () => null });
  const missing = response();
  await controller.uploadEnrollmentDocuments({ params: { id }, files: { nidDocument: [{ buffer: Buffer.from('data') }] } }, missing);
  assert.equal(missing.statusCode, 404);
});

test('removing one document unsets only that field while allowing another upload', async () => {
  Enrollment.findById = () => ({ select: async () => ({ student: id }) });
  const bytes = Buffer.from('%PDF-1.7');
  User.findOneAndUpdate = async (query, update) => {
    assert.deepEqual(update, { $unset: { nidDocument: 1 }, $set: {
      biodataDocument: { filename: 'bio.pdf', contentType: 'application/pdf', data: bytes }
    } });
    return { _id: id };
  };
  const res = response();
  await controller.uploadEnrollmentDocuments({ params: { id }, body: { remove_nidDocument: 'true' },
    files: { biodataDocument: [{ originalname: 'bio.pdf', mimetype: 'application/pdf', buffer: bytes }] } }, res);
  assert.equal(res.body.success, true);
});

test('removal without an upload succeeds and conflicting changes are rejected', async () => {
  Enrollment.findById = () => ({ select: async () => ({ student: id }) });
  User.findOneAndUpdate = async (query, update) => {
    assert.deepEqual(update, { $unset: { nidDocument: 1 } });
    return { _id: id };
  };
  const res = response();
  await controller.uploadEnrollmentDocuments({ params: { id }, body: { remove_nidDocument: 'true' } }, res);
  assert.equal(res.body.success, true);
  const conflict = response();
  await controller.uploadEnrollmentDocuments({ params: { id }, body: { remove_nidDocument: 'true' }, files: { nidDocument: [{}] } }, conflict);
  assert.equal(conflict.statusCode, 400);
});

test('enrollment document upload allows only admins before parsing files', () => {
  const router = require('../routes/enrollmentRoutes');
  const route = router.stack.find(layer => layer.route?.path === '/:id/documents').route;
  for (const role of ['student', 'instructor']) {
    const res = response();
    route.stack[1].handle({ user: { role } }, res, () => assert.fail('Non-admin must not pass'));
    assert.equal(res.statusCode, 403);
  }
});

test('public registration rejects multipart uploads and document fields', () => {
  const router = require('../routes/authRoutes');
  const route = router.stack.find(layer => layer.route?.path === '/register').route;
  for (const request of [
    { is: () => true, body: {} },
    { is: () => false, body: { nidDocument: 'document' } },
    { is: () => false, body: { biodataDocument: 'document' } }
  ]) {
    const res = response();
    route.stack[1].handle(request, res, () => assert.fail('Public uploads must not pass'));
    assert.equal(res.statusCode, 400);
  }
  let passed = false;
  route.stack[1].handle({ is: () => false, body: { name: 'Student' } }, response(), () => { passed = true; });
  assert.equal(passed, true);
});

test('student profile includes personal details and document metadata without document bytes or secrets', async () => {
  let projection;
  User.findOne = query => {
    assert.deepEqual(query, { _id: id, role: 'student' });
    return { select(fields) {
      const q = new User.Query().select(fields);
      q.model = User;
      q._applyPaths();
      projection = q.projection();
      return { lean: async () => ({ _id: id, name: 'Student', fatherName: 'Father', nidNumber: '001234',
        nidDocument: { filename: 'nid.pdf', contentType: 'application/pdf' } }) };
    } };
  };
  const res = response();
  await controller.getStudentProfile({ params: { id } }, res);
  assert.equal(res.body.data.nidNumber, '001234');
  assert.equal(res.body.data.documents.nidDocument.filename, 'nid.pdf');
  assert.equal(res.body.data.documents.biodataDocument, null);
  assert.equal(res.body.data.nidDocument, undefined);
  for (const field of ['password', 'otp', 'resetPasswordOtp', 'nidDocument.data', 'biodataDocument.data']) assert.equal(projection[field], 0);
});

test('document response returns original bytes with safe download headers', async () => {
  const bytes = Buffer.from('%PDF-1.7');
  User.findOne = () => ({ select: async () => ({ nidDocument: {
    filename: 'national ID.pdf', contentType: 'application/pdf', data: bytes
  } }) });
  const res = response();
  await controller.getStudentDocument({ params: { id, document: 'nidDocument' }, query: { download: '1' } }, res);
  assert.deepEqual(res.body, bytes);
  assert.equal(res.headers['Content-Type'], 'application/pdf');
  assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.match(res.headers['Content-Disposition'], /^attachment;.*national%20ID.pdf$/);
});

test('invalid IDs, unrecognized documents and absent submissions return clear errors', async () => {
  const invalid = response();
  await controller.getStudentProfile({ params: { id: 'invalid' } }, invalid);
  assert.equal(invalid.statusCode, 400);
  const unknown = response();
  await controller.getStudentDocument({ params: { id, document: 'password' } }, unknown);
  assert.equal(unknown.statusCode, 400);
  User.findOne = () => ({ select: async () => null });
  const missing = response();
  await controller.getStudentDocument({ params: { id, document: 'biodataDocument' }, query: {} }, missing);
  assert.equal(missing.statusCode, 404);
});

test('profile and document routes enforce admin access', () => {
  const router = require('../routes/userRoutes');
  for (const path of ['/:id/student-profile', '/:id/documents/:document']) {
    const route = router.stack.find(layer => layer.route?.path === path).route;
    assert.equal(route.stack.length, 3);
    for (const role of ['student', 'instructor']) {
      const res = response();
      route.stack[1].handle({ user: { role } }, res, () => assert.fail('Non-admin must not pass'));
      assert.equal(res.statusCode, 403);
    }
  }
  let passed = false;
  authorize('admin')({ user: { role: 'admin' } }, response(), () => { passed = true; });
  assert.equal(passed, true);
});
