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
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../utils/cloudinary');

router.get('/instructors', protect, authorize('admin'), getInstructors);

router.route('/')
  .get(protect, authorize('admin'), getAllUsers)
  .post(protect, authorize('admin'), createUser);

router.route('/:id')
  .get(protect, getUser)
  .put(protect, updateUser)
  .delete(protect, authorize('admin'), deleteUser);

router.put('/:id/avatar', protect, upload.single('avatar'), uploadAvatar);

module.exports = router;
