const express = require('express');
const router = express.Router();
const {
  getAllEnrollments,
  getEnrollment,
  createEnrollment,
  updateEnrollmentStatus,
  markAttendance,
  updateProgress,
  getMyEnrollments,
  getMyStudents,
  getMyCourses,
  getEnrollmentsByCourse,
  bulkMarkAttendance
} = require('../controllers/enrollmentController');
const { protect, authorize } = require('../middleware/auth');
const registrationDocuments = require('../middleware/registrationDocuments');
const { uploadEnrollmentDocuments } = require('../controllers/studentProfileController');

router.put('/:id/documents', protect, authorize('admin'), registrationDocuments, uploadEnrollmentDocuments);

router.get('/my-enrollments', protect, authorize('student'), getMyEnrollments);
router.get('/my-students', protect, authorize('instructor'), getMyStudents);
router.get('/my-courses', protect, authorize('instructor'), getMyCourses);
router.get('/course/:courseId', protect, authorize('instructor', 'admin'), getEnrollmentsByCourse);
router.post('/attendance/bulk', protect, authorize('instructor', 'admin'), bulkMarkAttendance);

router.route('/')
  .get(protect, authorize('admin'), getAllEnrollments)
  .post(protect, authorize('student'), createEnrollment);

router.route('/:id')
  .get(protect, getEnrollment);

router.put('/:id/status', protect, authorize('admin', 'instructor'), updateEnrollmentStatus);
router.post('/:id/attendance', protect, authorize('instructor', 'admin'), markAttendance);
router.put('/:id/progress', protect, authorize('instructor', 'admin'), updateProgress);

module.exports = router;
