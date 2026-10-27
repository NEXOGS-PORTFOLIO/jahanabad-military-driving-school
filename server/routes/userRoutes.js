const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  uploadAvatar,
  getInstructors
} = require('../controllers/userController');
const { getStudentProfile, getStudentDocument } = require('../controllers/studentProfileController');
const { exportStudents } = require('../controllers/studentExportController');
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../utils/cloudinary');

router.get('/instructors', protect, authorize('admin'), getInstructors);
router.get('/students/export', protect, authorize('admin'), exportStudents);
router.get('/:id/student-profile', protect, authorize('admin'), getStudentProfile);
router.get('/:id/documents/:document', protect, authorize('admin'), getStudentDocument);

router.route('/')
  .get(protect, authorize('admin'), getAllUsers)
  .post(protect, authorize('admin'), createUser);

router.route('/:id')
  .get(protect, getUser)
  .put(protect, updateUser)
  .delete(protect, authorize('admin'), deleteUser);

router.put('/:id/avatar', protect, upload.single('avatar'), uploadAvatar);

module.exports = router;
