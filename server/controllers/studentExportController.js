const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const Certificate = require('../models/Certificate');
const { buildStudentExport, createStudentCSV, createStudentWorkbook } = require('../utils/studentExport');

// Preserve reference IDs when a previously linked course or staff record was deleted.
const reference = (path, select, populate) => ({ path, select, populate, transform: (document, id) => document || (id ? { _id: id } : null) });
const staffFields = 'name email phone';
const courseFields = 'title description duration price category vehicleTypes capacity image isActive createdBy createdAt updatedAt';
const batchFields = 'name batchNumber batchNo course courseType vehicleTypes instructors assignedInstructors capacity enrolledCount completedCount officialStudentCount officialCompletedCount startDate endDate fee schedule status isPublished notes createdBy createdAt updatedAt';
const coursePopulation = () => [reference('createdBy', staffFields)];
const batchPopulation = () => [reference('course', courseFields, coursePopulation()), reference('instructors', staffFields), reference('assignedInstructors', staffFields), reference('createdBy', staffFields)];

exports.exportStudents = async (req, res) => {
  const format = req.query.format || 'csv';
  if (!['csv', 'excel'].includes(format)) {
    return res.status(400).json({ success: false, message: 'Unsupported student export format' });
  }
  try {
    // Fetch the complete registration list, independent of dashboard filters or pages.
    // Only document metadata is read; document bytes and authentication secrets stay out.
    const students = await User.find({ role: 'student' })
      .select('+nidDocument +biodataDocument -nidDocument.data -biodataDocument.data')
      .sort({ createdAt: -1, _id: 1 }).lean();
    const studentIds = students.map(student => student._id);
    const [enrollments, certificates] = studentIds.length ? await Promise.all([
      Enrollment.find({ student: { $in: studentIds } })
        .populate(reference('course', courseFields, coursePopulation()))
        .populate(reference('batch', batchFields, batchPopulation()))
        .populate(reference('instructor', staffFields))
        .populate(reference('attendance.markedBy', staffFields))
        .populate(reference('progressComments.author', staffFields))
        .sort({ enrolledAt: -1, _id: 1 }).lean(),
      Certificate.find({ student: { $in: studentIds } }).select('-pdfData -pdfFingerprint')
        .populate(reference('course', courseFields, coursePopulation()))
        .populate(reference('batch', batchFields, batchPopulation()))
        .populate(reference('revokedBy', staffFields))
        .sort({ issuedDate: -1, _id: 1 }).lean()
    ]) : [[], []];
    const records = buildStudentExport({ students, enrollments, certificates });
    const content = format === 'excel' ? await createStudentWorkbook(records) : createStudentCSV(records);
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const extension = format === 'excel' ? 'xlsx' : 'csv';
    res.set({
      'Content-Type': format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="students-export-${date}.${extension}"`,
      'Access-Control-Expose-Headers': 'Content-Disposition',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    return res.send(content);
  } catch (error) {
    console.error('Student export failed:', error.name);
    return res.status(500).json({ success: false, message: 'Unable to export student records' });
  }
};
