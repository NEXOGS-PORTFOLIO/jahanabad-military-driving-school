const express = require('express');
const router = express.Router();
const {
  getAllCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  toggleCourseStatus
} = require('../controllers/courseController');
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../utils/cloudinary');

router.route('/')
  .get(getAllCourses)
  .post(protect, authorize('admin'), upload.single('image'), createCourse);

router.route('/:id')
  .get(getCourse)
  .put(protect, authorize('admin'), upload.single('image'), updateCourse)
  .delete(protect, authorize('admin'), deleteCourse);

router.patch('/:id/toggle-status', protect, authorize('admin'), toggleCourseStatus);

module.exports = router;
