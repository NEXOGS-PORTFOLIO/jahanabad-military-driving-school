const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const { parseString } = require('fast-csv');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const Certificate = require('../models/Certificate');
const { buildStudentExport, createStudentCSV, createStudentWorkbook } = require('../utils/studentExport');
const { exportStudents } = require('../controllers/studentExportController');
const originals = { userFind: User.find, enrollmentFind: Enrollment.find, certificateFind: Certificate.find };
afterEach(() => { User.find = originals.userFind; Enrollment.find = originals.enrollmentFind; Certificate.find = originals.certificateFind; });

const fixture = () => {
  const students = [
    { _id: 'student-1', name: 'আয়েশা, "রহমান"', fatherName: 'Abdul Rahman', gender: 'female', email: 'ayesha@example.com', phone: '+8801712345678',
      nidNumber: '001234567890123456', role: 'student', status: 'active', isVerified: true, phoneVerified: false,
      createdAt: '2026-01-01', updatedAt: '2026-10-13', password: 'SECRET_PASSWORD', otp: 'SECRET_OTP',
      nidDocument: { filename: 'nid.pdf', contentType: 'application/pdf', data: Buffer.from('SECRET_DOCUMENT_BYTES') },
      biodataDocument: { filename: 'biodata.png', contentType: 'image/png' } },
    { _id: 'student-2', name: 'Unenrolled Student', email: 'new@example.com', role: 'student', status: 'inactive', isVerified: false }
  ];
  const instructor = { _id: 'instructor-1', name: 'Instructor', email: 'instructor@example.com', phone: '+8801812345678' };
  const course = { _id: 'course-1', title: 'Light Vehicle', description: 'Detailed course description', duration: '6 weeks', price: 0, isActive: true, vehicleTypes: ['Car'], capacity: 20 };
  const batch = { _id: 'batch-1', name: 'July Training', batchNumber: '001', batchNo: 0, course, startDate: '2026-07-01', endDate: '2026-09-30',
    status: 'completed', courseType: 'Practical', fee: 0, capacity: 20, schedule: 'Morning', notes: 'Batch notes',
    instructors: [instructor], assignedInstructors: [instructor], isPublished: false };
  const enrollments = [
    { _id: 'enrollment-1', student: 'student-1', course, batch, instructor, status: 'completed', progress: 100, paymentStatus: 'waived', documentStatus: 'verified',
      enrolledAt: '2026-07-01', approvedAt: '2026-07-02', completedAt: '2026-09-30', notes: 'Completed practical assessment',
      attendance: [{ _id: 'attendance-1', date: '2026-07-03', status: 'present', markedBy: instructor }, { _id: 'attendance-2', date: '2026-07-04', status: 'late', markedBy: instructor }],
      progressComments: [{ _id: 'comment-1', text: 'Improved driving,\n"passed"', author: instructor, authorName: 'Instructor at time of comment', progress: 65, createdAt: '2026-08-01' }] },
    { _id: 'enrollment-2', student: 'student-1', course: { _id: 'deleted-course' }, status: 'pending', progress: 0, attendance: [], progressComments: [] }
  ];
  const certificates = [
    { _id: 'certificate-1', certificateId: 'JMDS-001', student: 'student-1', enrollment: 'enrollment-1', course, batch, status: 'valid', issuedDate: '2026-10-01', pdfData: 'SECRET_PDF' },
    { _id: 'certificate-2', certificateId: 'JMDS-002', student: 'student-1', enrollment: 'deleted-enrollment', course, status: 'revoked',
      revokedAt: '2026-10-13', revokeReason: 'Corrected information', revokedBy: { _id: 'admin-1', name: 'Administrator', email: 'admin@example.com' } }
  ];
  return { students, enrollments, certificates };
};
const sheet = (records, name) => records.sheets.find(item => item.name === name);
const parseCSV = content => new Promise((resolve, reject) => {
  const rows = [];
  parseString(content.toString('utf8').replace(/^\uFEFF/, ''), { headers: true }).on('data', row => rows.push(row)).on('end', () => resolve(rows)).on('error', reject);
});

test('all students and individual training records are exported, including unenrolled students and orphan certificates', () => {
  const records = buildStudentExport(fixture());
  assert.equal(sheet(records, 'Students').rows.length, 2);
  assert.equal(sheet(records, 'Enrollments').rows.length, 2);
  assert.equal(sheet(records, 'Attendance').rows.length, 2);
  assert.equal(sheet(records, 'Progress Comments').rows.length, 1);
  assert.equal(sheet(records, 'Certificates').rows.length, 2);
  assert.equal(sheet(records, 'Courses').rows.length, 2);
  assert.equal(sheet(records, 'Batches').rows.length, 1);
  const student = sheet(records, 'Students').rows[0];
  assert.equal(student['Gender'], 'female');
  assert.equal(student['Phone Verified'], 'No');
  assert.equal(student['Enrollment Count'], 2);
  assert.equal(student['Attendance Record Count'], 2);
  assert.equal(student['Valid Certificate Count'], 1);
  assert.equal(student['Revoked Certificate Count'], 1);
  assert.equal(student['NID Document Filename'], 'nid.pdf');
  assert.equal(sheet(records, 'Enrollments').rows[1]['Course ID'], 'deleted-course');
  assert.equal(sheet(records, 'Batches').rows[0]['Batch Instructor IDs'], 'instructor-1');
  assert.equal(sheet(records, 'Batches').rows[0]['Batch Published'], 'No');
  assert.equal(sheet(records, 'Progress Comments').rows[0]['Progress Author Name'], 'Instructor at time of comment');
  const exported = JSON.stringify(records);
  for (const secret of ['SECRET_PASSWORD', 'SECRET_OTP', 'SECRET_DOCUMENT_BYTES', 'SECRET_PDF']) assert.ok(!exported.includes(secret));
});

test('CSV contains only student report rows, preserves formatting, and protects spreadsheet text', async () => {
  const data = fixture();
  data.students[1].name = '  =HYPERLINK("https://example.com")';
  data.enrollments[0].course.title = '@Light, "Vehicle"';
  const content = createStudentCSV(buildStudentExport(data));
  assert.deepEqual([...content.subarray(0, 3)], [239, 187, 191]);
  const rows = await parseCSV(content);
  assert.equal(rows.length, 4);
  assert.ok(rows.every(row => row['Student ID'] && row['Student Name']));
  assert.equal(rows[0]['Student Name'], data.students[0].name);
  assert.equal(rows[0]['Phone Number'], "'+8801712345678");
  assert.equal(rows[0]['Course'], "'@Light, \"Vehicle\"");
  assert.equal(rows[0]['Attendance Records'], '2026-07-03: present\n2026-07-04: late');
  assert.equal(rows[0]['Attendance Sessions'], '2');
  assert.equal(rows[0]['Present'], '1');
  assert.equal(rows[0]['Late'], '1');
  assert.equal(rows[0]['Attended (%)'], '100');
  assert.equal(rows[0]['Certificate IDs'], 'JMDS-001');
  assert.equal(rows[0]['Certificate Statuses'], 'valid');
  assert.equal(rows[1]['Progress (%)'], '0');
  assert.equal(rows[1]['Attended (%)'], '');
  assert.equal(rows[1]['Course'], 'Course unavailable');
  assert.equal(rows[2]['Certificate IDs'], 'JMDS-002');
  assert.equal(rows[2]['Enrollment Status'], 'Enrollment record unavailable');
  assert.ok(rows[3]['Student Name'].startsWith("'  ="));
  assert.equal(rows[3]['Enrollment Status'], 'Not enrolled');
  for (const column of ['Record Type', 'Course ID', 'Batch ID', 'Enrollment ID', 'NID Number', 'Avatar URL', 'Registered At (UTC)', 'NID Document Download Path', 'Progress Author ID', 'Enrollment Notes']) {
    assert.ok(!Object.hasOwn(rows[0], column), `Unnecessary field: ${column}`);
  }
});

test('CSV keeps every enrollment, uses recorded attendance accurately, and associates certificates with the correct course', async () => {
  const data = fixture();
  data.enrollments[0].attendance.push({ _id: 'attendance-3', date: '2026-07-05', status: 'absent' });
  data.certificates.push({ ...data.certificates[0], _id: 'certificate-3', certificateId: 'JMDS-003', status: 'revoked' });
  const rows = await parseCSV(createStudentCSV(buildStudentExport(data)));
  assert.equal(rows[0]['Absent'], '1');
  assert.equal(rows[0]['Attended (%)'], '66.67');
  assert.equal(rows[0]['Certificate IDs'], 'JMDS-001\nJMDS-003');
  assert.equal(rows[0]['Certificate Statuses'], 'valid\nrevoked');
  assert.equal(rows[1]['Certificate IDs'], '');
  assert.equal(rows[3]['Attendance Sessions'], '');
});

test('Excel is a genuine readable workbook with separate sheets, filters, numeric values, and exact text identifiers', async () => {
  const data = fixture();
  data.students[1].name = '=SUM(1,1)';
  const buffer = await createStudentWorkbook(buildStudentExport(data));
  assert.equal(buffer.subarray(0, 2).toString(), 'PK');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  assert.equal(workbook.worksheets.length, 8);
  const students = workbook.getWorksheet('Students');
  const value = (sheetName, label, row = 2) => {
    const target = workbook.getWorksheet(sheetName);
    const column = target.getRow(1).values.indexOf(label);
    return target.getRow(row).getCell(column);
  };
  assert.equal(students.rowCount, 3);
  assert.equal(value('Students', 'NID Number').value, data.students[0].nidNumber);
  assert.equal(value('Students', 'Phone Number').value, data.students[0].phone);
  assert.equal(value('Students', 'Student Name', 3).type, ExcelJS.ValueType.String);
  assert.equal(value('Students', 'Student Name', 3).value, '=SUM(1,1)');
  assert.equal(value('Courses', 'Course Price (BDT)').value, 0);
  assert.equal(value('Enrollments', 'Progress (%)', 3).value, 0);
  assert.equal(value('Batches', 'Batch No').value, 0);
  assert.equal(workbook.getWorksheet('Certificates').rowCount, 3);
  assert.equal(workbook.getWorksheet('Attendance').rowCount, 3);
  assert.equal(students.views[0].state, 'frozen');
  assert.ok(students.autoFilter);
});

test('empty exports retain clearly labeled CSV columns and all Excel sheets', async () => {
  const records = buildStudentExport({ students: [], enrollments: [], certificates: [] });
  assert.equal((await parseCSV(createStudentCSV(records))).length, 0);
  assert.ok(createStudentCSV(records).toString().includes('Student Name'));
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await createStudentWorkbook(records));
  assert.equal(workbook.getWorksheet('Students').rowCount, 1);
});

const response = () => ({ statusCode: 200, headers: {}, status(code) { this.statusCode = code; return this; },
  set(headers) { Object.assign(this.headers, headers); return this; }, json(body) { this.body = body; return this; }, send(body) { this.body = body; return this; } });
const query = records => ({ select() { return this; }, populate() { return this; }, sort() { return this; }, async lean() { return records; } });

test('export endpoint reads every student regardless of filters, scopes related records, and sets download headers', async () => {
  const data = fixture();
  User.find = filter => {
    assert.deepEqual(filter, { role: 'student' });
    const result = query(data.students);
    result.select = function (fields) {
      const projectionQuery = new User.Query().select(fields);
      projectionQuery.model = User;
      projectionQuery._applyPaths();
      const projection = projectionQuery.projection();
      for (const field of ['password', 'otp', 'smsOtpHash', 'resetPasswordOtp', 'nidDocument.data', 'biodataDocument.data']) assert.equal(projection[field], 0);
      return this;
    };
    return result;
  };
  const related = records => filter => { assert.deepEqual(filter, { student: { $in: ['student-1', 'student-2'] } }); return query(records); };
  Enrollment.find = related(data.enrollments);
  Certificate.find = related(data.certificates);
  for (const format of ['csv', 'excel']) {
    const res = response();
    await exportStudents({ query: { format, search: 'no matches', status: 'active' } }, res);
    assert.equal(res.statusCode, 200);
    assert.ok(Buffer.isBuffer(res.body));
    assert.equal(res.headers['Cache-Control'], 'no-store');
    assert.match(res.headers['Content-Disposition'], format === 'excel' ? /\.xlsx"$/ : /\.csv"$/);
    assert.match(res.headers['Content-Type'], format === 'excel' ? /spreadsheetml/ : /text\/csv/);
  }
});

test('export rejects invalid formats before database access and reports failures without a partial file', async () => {
  User.find = () => { throw new Error('Database unavailable'); };
  const invalid = response();
  await exportStudents({ query: { format: 'invalid' } }, invalid);
  assert.equal(invalid.statusCode, 400);
  const unavailable = response();
  await exportStudents({ query: { format: 'csv' } }, unavailable);
  assert.equal(unavailable.statusCode, 500);
  assert.equal(unavailable.body.message, 'Unable to export student records');
});

test('export route requires authentication and administrator role', async () => {
  const router = require('../routes/userRoutes');
  const route = router.stack.find(layer => layer.route?.path === '/students/export').route;
  assert.equal(route.stack.length, 3);
  const unauthenticated = response();
  await route.stack[0].handle({ headers: {} }, unauthenticated, () => assert.fail('Authentication is required'));
  assert.equal(unauthenticated.statusCode, 401);
  for (const role of ['student', 'instructor']) {
    const res = response();
    route.stack[1].handle({ user: { role } }, res, () => assert.fail('Non-admin must not export'));
    assert.equal(res.statusCode, 403);
  }
});
