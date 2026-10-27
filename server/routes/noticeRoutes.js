const express = require('express');
const router = express.Router();
const {
  getNotices,
  getNoticeBySlug,
  getAllNoticesAdmin,
  createNotice,
  updateNotice,
  deleteNotice,
  toggleNoticePublish
} = require('../controllers/noticeController');
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../utils/cloudinary');

router.get('/', getNotices);
router.get('/admin/all', protect, authorize('admin'), getAllNoticesAdmin);
router.post('/', protect, authorize('admin'), upload.single('image'), createNotice);
router.put('/:id', protect, authorize('admin'), upload.single('image'), updateNotice);
router.delete('/:id', protect, authorize('admin'), deleteNotice);
router.patch('/:id/toggle-publish', protect, authorize('admin'), toggleNoticePublish);
router.get('/:slug', getNoticeBySlug);

module.exports = router;
