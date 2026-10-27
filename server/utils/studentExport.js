const ExcelJS = require('exceljs');

const id = value => value ? String(value._id || value) : '';
const yesNo = value => value === true ? 'Yes' : value === false ? 'No' : '';
const date = value => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value).toISOString() : '';
const list = values => [...new Set(values.filter(value => value !== undefined && value !== null && value !== ''))].join('\n');
const referenceColumns = ['Student ID', 'Student Name', 'Email Address'];
const courseColumns = ['Course ID', 'Course Title', 'Course Description', 'Course Duration', 'Course Price (BDT)',
  'Course Category', 'Course Vehicle Types', 'Course Capacity', 'Course Active', 'Course Image URL', 'Course Image ID',
  'Course Created By ID', 'Course Created By Name', 'Course Created By Email', 'Course Created At (UTC)', 'Course Updated At (UTC)'];
const batchColumns = ['Batch ID', 'Batch Name', 'Batch Number', 'Batch No', 'Batch Course ID', 'Batch Course Title',
  'Batch Course Type', 'Batch Vehicle Types', 'Batch Instructor IDs', 'Batch Instructor Names', 'Batch Instructor Emails', 'Batch Instructor Phones',
  'Batch Assigned Instructor IDs', 'Batch Assigned Instructor Names', 'Batch Assigned Instructor Emails', 'Batch Assigned Instructor Phones',
  'Batch Capacity', 'Batch Enrolled Count', 'Batch Completed Count', 'Batch Official Student Count', 'Batch Official Completed Count',
  'Batch Start Date (UTC)', 'Batch End Date (UTC)', 'Batch Fee (BDT)', 'Batch Schedule', 'Batch Status', 'Batch Published',
  'Batch Notes', 'Batch Created By ID', 'Batch Created By Name', 'Batch Created By Email', 'Batch Created At (UTC)', 'Batch Updated At (UTC)'];
const studentColumns = ['Student ID', 'Student Name', 'Father’s Name', 'Gender', 'Email Address', 'Phone Number', 'NID Number',
  'Role', 'Account Status', 'Account Verified', 'Phone Verified', 'Registered At (UTC)', 'Profile Updated At (UTC)', 'Avatar URL', 'Avatar ID',
  'NID Document Submitted', 'NID Document Filename', 'NID Document Type', 'NID Document Download Path',
  'Biodata Document Submitted', 'Biodata Document Filename', 'Biodata Document Type', 'Biodata Document Download Path',
  'Enrollment Count', 'Courses', 'Batches', 'Enrollment Statuses', 'Attendance Record Count', 'Progress Comment Count',
  'Certificate Count', 'Valid Certificate Count', 'Revoked Certificate Count', 'Certificate IDs'];
const enrollmentColumns = [...referenceColumns, 'Enrollment ID', 'Course ID', 'Course Title', 'Batch ID', 'Batch Number',
  'Instructor ID', 'Instructor Name', 'Instructor Email', 'Instructor Phone', 'Enrollment Status', 'Payment Status', 'Document Status',
  'Batch Status Snapshot', 'Progress (%)', 'Enrollment Notes', 'Enrolled At (UTC)', 'Approved At (UTC)', 'Completed At (UTC)',
  'Enrollment Created At (UTC)', 'Enrollment Updated At (UTC)', 'Attendance Record Count', 'Present Count', 'Absent Count', 'Late Count', 'Progress Comment Count'];
const trainingColumns = [...referenceColumns, 'Enrollment ID', 'Course ID', 'Course Title', 'Batch ID', 'Batch Number'];
const attendanceColumns = [...trainingColumns, 'Attendance ID', 'Attendance Date (UTC)', 'Attendance Status',
  'Attendance Marked By ID', 'Attendance Marked By Name', 'Attendance Marked By Email', 'Attendance Marked By Phone'];
const progressColumns = [...trainingColumns, 'Progress Comment ID', 'Progress Comment', 'Recorded Progress (%)',
  'Progress Author ID', 'Progress Author Name', 'Progress Author Email', 'Progress Author Phone', 'Progress Recorded At (UTC)'];
const certificateColumns = [...referenceColumns, 'Certificate Record ID', 'Certificate ID', 'Enrollment ID', 'Course ID', 'Course Title', 'Batch ID', 'Batch Number',
  'Certificate Status', 'Certificate Issued At (UTC)', 'Certificate Revoked At (UTC)', 'Certificate Revoke Reason',
  'Certificate Revoked By ID', 'Certificate Revoked By Name', 'Certificate Revoked By Email', 'Certificate Revoked By Phone',
  'Certificate Created At (UTC)', 'Certificate Updated At (UTC)'];

const courseRecord = course => ({
  'Course ID': id(course), 'Course Title': course?.title, 'Course Description': course?.description,
  'Course Duration': course?.duration, 'Course Price (BDT)': course?.price, 'Course Category': course?.category,
  'Course Vehicle Types': list(course?.vehicleTypes || []), 'Course Capacity': course?.capacity,
  'Course Active': yesNo(course?.isActive), 'Course Image URL': course?.image?.url, 'Course Image ID': course?.image?.public_id,
  'Course Created By ID': id(course?.createdBy), 'Course Created By Name': course?.createdBy?.name, 'Course Created By Email': course?.createdBy?.email,
  'Course Created At (UTC)': date(course?.createdAt), 'Course Updated At (UTC)': date(course?.updatedAt)
});
const batchRecord = batch => {
  const instructors = batch?.instructors || [];
  const assignedInstructors = batch?.assignedInstructors || [];
  return {
    'Batch ID': id(batch), 'Batch Name': batch?.name, 'Batch Number': batch?.batchNumber, 'Batch No': batch?.batchNo,
    'Batch Course ID': id(batch?.course), 'Batch Course Title': batch?.course?.title,
    'Batch Course Type': batch?.courseType, 'Batch Vehicle Types': list(batch?.vehicleTypes || []),
    'Batch Instructor IDs': instructors.map(id).join('\n'), 'Batch Instructor Names': instructors.map(staff => staff?.name || '').join('\n'),
    'Batch Instructor Emails': instructors.map(staff => staff?.email || '').join('\n'), 'Batch Instructor Phones': instructors.map(staff => staff?.phone || '').join('\n'),
    'Batch Assigned Instructor IDs': assignedInstructors.map(id).join('\n'), 'Batch Assigned Instructor Names': assignedInstructors.map(staff => staff?.name || '').join('\n'),
    'Batch Assigned Instructor Emails': assignedInstructors.map(staff => staff?.email || '').join('\n'), 'Batch Assigned Instructor Phones': assignedInstructors.map(staff => staff?.phone || '').join('\n'),
    'Batch Capacity': batch?.capacity, 'Batch Enrolled Count': batch?.enrolledCount, 'Batch Completed Count': batch?.completedCount,
    'Batch Official Student Count': batch?.officialStudentCount, 'Batch Official Completed Count': batch?.officialCompletedCount,
    'Batch Start Date (UTC)': date(batch?.startDate), 'Batch End Date (UTC)': date(batch?.endDate),
    'Batch Fee (BDT)': batch?.fee, 'Batch Schedule': batch?.schedule, 'Batch Status': batch?.status,
    'Batch Published': yesNo(batch?.isPublished), 'Batch Notes': batch?.notes,
    'Batch Created By ID': id(batch?.createdBy), 'Batch Created By Name': batch?.createdBy?.name, 'Batch Created By Email': batch?.createdBy?.email,
    'Batch Created At (UTC)': date(batch?.createdAt), 'Batch Updated At (UTC)': date(batch?.updatedAt)
  };
};
const trainingRecord = (enrollment, student) => ({
  'Student ID': id(student), 'Student Name': student.name, 'Email Address': student.email,
  'Enrollment ID': id(enrollment), 'Course ID': id(enrollment?.course), 'Course Title': enrollment?.course?.title,
  'Batch ID': id(enrollment?.batch), 'Batch Number': enrollment?.batch?.batchNumber
});
const enrollmentRecord = (enrollment, student) => ({
  ...trainingRecord(enrollment, student),
  'Instructor ID': id(enrollment.instructor), 'Instructor Name': enrollment.instructor?.name,
  'Instructor Email': enrollment.instructor?.email, 'Instructor Phone': enrollment.instructor?.phone,
  'Enrollment Status': enrollment.status, 'Payment Status': enrollment.paymentStatus, 'Document Status': enrollment.documentStatus,
  'Batch Status Snapshot': enrollment.batchStatusSnapshot, 'Progress (%)': enrollment.progress, 'Enrollment Notes': enrollment.notes,
  'Enrolled At (UTC)': date(enrollment.enrolledAt), 'Approved At (UTC)': date(enrollment.approvedAt), 'Completed At (UTC)': date(enrollment.completedAt),
  'Enrollment Created At (UTC)': date(enrollment.createdAt), 'Enrollment Updated At (UTC)': date(enrollment.updatedAt),
  'Attendance Record Count': enrollment.attendance?.length || 0,
  'Present Count': (enrollment.attendance || []).filter(record => record.status === 'present').length,
  'Absent Count': (enrollment.attendance || []).filter(record => record.status === 'absent').length,
  'Late Count': (enrollment.attendance || []).filter(record => record.status === 'late').length,
  'Progress Comment Count': enrollment.progressComments?.length || 0
});
const studentRecord = (student, enrollments, certificates) => {
  const row = {
    'Student ID': id(student), 'Student Name': student.name, 'Father’s Name': student.fatherName, 'Gender': student.gender,
    'Email Address': student.email, 'Phone Number': student.phone, 'NID Number': student.nidNumber,
    'Role': student.role, 'Account Status': student.status, 'Account Verified': yesNo(student.isVerified), 'Phone Verified': yesNo(student.phoneVerified),
    'Registered At (UTC)': date(student.createdAt), 'Profile Updated At (UTC)': date(student.updatedAt),
    'Avatar URL': student.avatar?.url, 'Avatar ID': student.avatar?.public_id,
    'Enrollment Count': enrollments.length,
    'Courses': list([...enrollments, ...certificates].map(record => record.course?.title)),
    'Batches': list([...enrollments, ...certificates].map(record => record.batch?.batchNumber)),
    'Enrollment Statuses': list(enrollments.map(record => record.status)),
    'Attendance Record Count': enrollments.reduce((sum, record) => sum + (record.attendance?.length || 0), 0),
    'Progress Comment Count': enrollments.reduce((sum, record) => sum + (record.progressComments?.length || 0), 0),
    'Certificate Count': certificates.length, 'Valid Certificate Count': certificates.filter(record => record.status === 'valid').length,
    'Revoked Certificate Count': certificates.filter(record => record.status === 'revoked').length,
    'Certificate IDs': list(certificates.map(record => record.certificateId))
  };
  for (const [field, label] of [['nidDocument', 'NID Document'], ['biodataDocument', 'Biodata Document']]) {
    const document = student[field];
    row[`${label} Submitted`] = document ? 'Yes' : 'No';
    row[`${label} Filename`] = document?.filename;
    row[`${label} Type`] = document?.contentType;
    row[`${label} Download Path`] = document ? `/api/users/${id(student)}/documents/${field}?download=1` : '';
  }
  return row;
};

// Explicit columns and mappings ensure passwords, OTPs, binary documents, and
// cached PDFs cannot enter the spreadsheet even if present in an input object.
const buildStudentExport = ({ students, enrollments, certificates }) => {
  const studentMap = new Map(students.map(student => [id(student), student]));
  const group = records => {
    const result = new Map();
    for (const record of records) {
      const studentId = id(record.student);
      if (!studentMap.has(studentId)) continue;
      if (!result.has(studentId)) result.set(studentId, []);
      result.get(studentId).push(record);
    }
    return result;
  };
  const enrollmentGroups = group(enrollments), certificateGroups = group(certificates);
  const sheets = [
    { name: 'Students', columns: studentColumns, rows: [] },
    { name: 'Enrollments', columns: enrollmentColumns, rows: [] },
    { name: 'Courses', columns: courseColumns, rows: [] },
    { name: 'Batches', columns: batchColumns, rows: [] },
    { name: 'Attendance', columns: attendanceColumns, rows: [] },
    { name: 'Progress Comments', columns: progressColumns, rows: [] },
    { name: 'Certificates', columns: certificateColumns, rows: [] }
  ];
  const courseMap = new Map(), batchMap = new Map();
  const collectReferences = record => {
    for (const course of [record.course, record.batch?.course]) {
      if (id(course)) courseMap.set(id(course), courseRecord(course));
    }
    if (id(record.batch)) batchMap.set(id(record.batch), batchRecord(record.batch));
  };

  for (const student of students) {
    const studentEnrollments = enrollmentGroups.get(id(student)) || [];
    const studentCertificates = certificateGroups.get(id(student)) || [];
    const base = studentRecord(student, studentEnrollments, studentCertificates);
    sheets[0].rows.push(base);
    for (const enrollment of studentEnrollments) {
      collectReferences(enrollment);
      const training = trainingRecord(enrollment, student);
      const row = enrollmentRecord(enrollment, student);
      sheets[1].rows.push(row);
      for (const attendance of enrollment.attendance || []) {
        const attendanceRow = {
          ...training, 'Attendance ID': id(attendance), 'Attendance Date (UTC)': date(attendance.date), 'Attendance Status': attendance.status,
          'Attendance Marked By ID': id(attendance.markedBy), 'Attendance Marked By Name': attendance.markedBy?.name,
          'Attendance Marked By Email': attendance.markedBy?.email, 'Attendance Marked By Phone': attendance.markedBy?.phone
        };
        sheets[4].rows.push(attendanceRow);
      }
      for (const comment of enrollment.progressComments || []) {
        const progressRow = {
          ...training, 'Progress Comment ID': id(comment), 'Progress Comment': comment.text, 'Recorded Progress (%)': comment.progress,
          'Progress Author ID': id(comment.author), 'Progress Author Name': comment.authorName || comment.author?.name,
          'Progress Author Email': comment.author?.email, 'Progress Author Phone': comment.author?.phone, 'Progress Recorded At (UTC)': date(comment.createdAt)
        };
        sheets[5].rows.push(progressRow);
      }
    }
    for (const certificate of studentCertificates) {
      collectReferences(certificate);
      const row = {
        'Student ID': id(student), 'Student Name': student.name, 'Email Address': student.email,
        'Certificate Record ID': id(certificate), 'Certificate ID': certificate.certificateId, 'Enrollment ID': id(certificate.enrollment),
        'Course ID': id(certificate.course), 'Course Title': certificate.course?.title, 'Batch ID': id(certificate.batch), 'Batch Number': certificate.batch?.batchNumber,
        'Certificate Status': certificate.status, 'Certificate Issued At (UTC)': date(certificate.issuedDate),
        'Certificate Revoked At (UTC)': date(certificate.revokedAt), 'Certificate Revoke Reason': certificate.revokeReason,
        'Certificate Revoked By ID': id(certificate.revokedBy), 'Certificate Revoked By Name': certificate.revokedBy?.name,
        'Certificate Revoked By Email': certificate.revokedBy?.email, 'Certificate Revoked By Phone': certificate.revokedBy?.phone,
        'Certificate Created At (UTC)': date(certificate.createdAt), 'Certificate Updated At (UTC)': date(certificate.updatedAt)
      };
      sheets[6].rows.push(row);
    }
  }
  sheets[2].rows = [...courseMap.values()];
  sheets[3].rows = [...batchMap.values()];
  return { sheets, ...buildStudentCSVReport(sheets) };
};

// One row per student enrollment, with unenrolled students included once.
// Certificates without a remaining enrollment still get a student-course row.
const buildStudentCSVReport = sheets => {
  const rows = name => sheets.find(sheet => sheet.name === name).rows;
  const csvColumns = ['Student ID', 'Student Name', 'Email Address', 'Phone Number', 'Course', 'Course Duration', 'Batch',
    'Enrollment Status', 'Enrolled Date', 'Completed Date', 'Instructor', 'Attendance Sessions', 'Present', 'Absent', 'Late',
    'Attended (%)', 'Attendance Records', 'Progress (%)', 'Certificate IDs', 'Certificate Statuses', 'Certificate Issued Dates'];
  const group = (records, key) => {
    const groups = new Map();
    for (const record of records) {
      const value = typeof key === 'function' ? key(record) : record[key];
      if (!groups.has(value)) groups.set(value, []);
      groups.get(value).push(record);
    }
    return groups;
  };
  const enrollments = group(rows('Enrollments'), 'Student ID');
  const attendance = group(rows('Attendance'), 'Enrollment ID');
  const certificates = group(rows('Certificates'), 'Student ID');
  const courses = new Map(rows('Courses').map(course => [course['Course ID'], course]));
  const dateFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' });
  const day = value => value ? dateFormat.format(new Date(value)) : '';
  const csvRows = [];
  for (const student of rows('Students')) {
    const studentEnrollments = enrollments.get(student['Student ID']) || [];
    const studentCertificates = certificates.get(student['Student ID']) || [];
    const addRow = (enrollment, relatedCertificates, orphan = false) => {
      const courseId = enrollment?.['Course ID'] || relatedCertificates[0]?.['Course ID'];
      const course = courses.get(courseId);
      const records = enrollment ? attendance.get(enrollment['Enrollment ID']) || [] : [];
      const present = records.filter(record => record['Attendance Status'] === 'present').length;
      const absent = records.filter(record => record['Attendance Status'] === 'absent').length;
      const late = records.filter(record => record['Attendance Status'] === 'late').length;
      csvRows.push({
        'Student ID': student['Student ID'], 'Student Name': student['Student Name'],
        'Email Address': student['Email Address'], 'Phone Number': student['Phone Number'],
        'Course': course?.['Course Title'] || enrollment?.['Course Title'] || relatedCertificates[0]?.['Course Title'] || (courseId ? 'Course unavailable' : ''),
        'Course Duration': course?.['Course Duration'], 'Batch': enrollment?.['Batch Number'] || relatedCertificates[0]?.['Batch Number'],
        'Enrollment Status': enrollment?.['Enrollment Status'] || (orphan ? 'Enrollment record unavailable' : 'Not enrolled'),
        'Enrolled Date': day(enrollment?.['Enrolled At (UTC)']), 'Completed Date': day(enrollment?.['Completed At (UTC)']),
        'Instructor': enrollment?.['Instructor Name'],
        'Attendance Sessions': enrollment ? records.length : '', 'Present': enrollment ? present : '',
        'Absent': enrollment ? absent : '', 'Late': enrollment ? late : '',
        'Attended (%)': records.length ? Math.round((present + late) / records.length * 10000) / 100 : '',
        'Attendance Records': records.map(record => `${day(record['Attendance Date (UTC)'])}: ${record['Attendance Status']}`).join('\n'),
        'Progress (%)': enrollment?.['Progress (%)'],
        'Certificate IDs': relatedCertificates.map(record => record['Certificate ID'] || '').join('\n'),
        'Certificate Statuses': relatedCertificates.map(record => record['Certificate Status'] || '').join('\n'),
        'Certificate Issued Dates': relatedCertificates.map(record => day(record['Certificate Issued At (UTC)'])).join('\n')
      });
    };
    const enrollmentIds = new Set(studentEnrollments.map(record => record['Enrollment ID']));
    for (const enrollment of studentEnrollments) addRow(enrollment, studentCertificates.filter(record => record['Enrollment ID'] === enrollment['Enrollment ID']));
    const orphanGroups = group(studentCertificates.filter(record => !enrollmentIds.has(record['Enrollment ID'])), record => JSON.stringify([record['Enrollment ID'], record['Course ID'], record['Batch ID']]));
    for (const related of orphanGroups.values()) addRow(null, related, true);
    if (!studentEnrollments.length && !studentCertificates.length) addRow(null, []);
  }
  return { csvColumns, csvRows };
};

const cellValue = value => value === undefined || value === null ? '' : typeof value === 'object' ? JSON.stringify(value) : value;
const csvValue = value => {
  value = cellValue(value);
  let text = value === undefined || value === null ? '' : String(value);
  // Treat spreadsheet formulas and long/zero-prefixed identifiers as text.
  if (typeof value === 'string' && (/^[\s\uFEFF]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text) || /^0\d+$/.test(text) || /^\d{15,}$/.test(text))) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};
const createStudentCSV = ({ csvColumns, csvRows }) => Buffer.from('\uFEFF' + [
  csvColumns.map(csvValue).join(','), ...csvRows.map(row => csvColumns.map(column => csvValue(row[column])).join(','))
].join('\r\n'), 'utf8');

const createStudentWorkbook = async ({ sheets }) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Jahanabad Military Driving School';
  workbook.created = new Date();
  const guide = workbook.addWorksheet('Export Guide');
  guide.columns = [{ header: 'Topic', key: 'topic', width: 24 }, { header: 'Details', key: 'details', width: 100 }];
  guide.addRows([
    { topic: 'Scope', details: 'Every registered student is included, regardless of dashboard search, filters, pagination, verification, or enrollment status.' },
    { topic: 'Relationships', details: 'Match Student ID, Enrollment ID, Course ID, and Batch ID across sheets. Students has one row per student; other sheets have one row per related record.' },
    { topic: 'Student summary', details: 'Counts and course, batch, and certificate summaries are included. The related sheets contain the complete individual records.' },
    { topic: 'Dates', details: 'All timestamps use ISO 8601 in UTC. The download filename uses the date in Asia/Dhaka.' },
    { topic: 'Missing data', details: 'Blank cells mean no value is available. Zero values and false verification states are preserved. Deleted linked records retain their IDs where available.' },
    { topic: 'Documents', details: 'Document filenames, types, and authenticated download paths are included. Binary attachments are available through the admin student profile.' },
    { topic: 'Identifiers', details: 'Phone numbers, NID numbers, and identifiers are stored as text to preserve leading zeroes and avoid rounding.' },
    { topic: 'CSV format', details: 'The CSV is a concise student report with one row per enrollment, plus unenrolled students and certificates whose enrollment records are unavailable. It contains contact details, courses, dated attendance records, attendance counts, progress, and certificate outcomes. Attended (%) counts present and late sessions out of recorded sessions; no recorded attendance leaves this percentage blank. CSV calendar dates use Asia/Dhaka. Text that spreadsheet apps could interpret as a formula or numeric identifier is prefixed with an apostrophe.' },
    { topic: 'Security', details: 'Passwords, verification codes, password-reset tokens, document bytes, and cached certificate PDFs are not spreadsheet fields.' }
  ]);
  for (const { name, columns, rows } of sheets) {
    const sheet = workbook.addWorksheet(name);
    sheet.columns = columns.map(label => ({ header: label, key: label,
      width: /Description|Notes|Comment$|URL|Path|Name|Email/.test(label) ? 36 : 24 }));
    for (const record of rows) {
      const row = sheet.addRow(columns.map(column => cellValue(record[column])));
      row.eachCell(cell => { if (typeof cell.value === 'string') cell.numFmt = '@'; });
    }
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, rows.length + 1), column: columns.length } };
  }
  for (const sheet of workbook.worksheets) {
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.getRow(1).height = 32;
    sheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF203F2B' } };
      cell.alignment = { vertical: 'middle', wrapText: true };
    });
    sheet.eachRow((row, number) => {
      if (number === 1) return;
      row.alignment = { vertical: 'top', wrapText: true };
      if (number % 2 === 0) row.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F6ED' } }; });
    });
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
};

module.exports = { buildStudentExport, createStudentCSV, createStudentWorkbook };
