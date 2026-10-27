const express = require('express');
const router = express.Router();
const {
  getPublicBatches,
  getBatch,
  getAllBatchesAdmin,
  getMyBatches,
  createBatch,
  updateBatch,
  deleteBatch,
  toggleBatchPublish,
  updateBatchStatus
} = require('../controllers/batchController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', getPublicBatches);
router.get('/admin/all', protect, authorize('admin'), getAllBatchesAdmin);
router.get('/my-batches', protect, authorize('instructor'), getMyBatches);
router.post('/', protect, authorize('admin'), createBatch);
router.patch('/:id/toggle-publish', protect, authorize('admin'), toggleBatchPublish);
router.patch('/:id/status', protect, authorize('admin'), updateBatchStatus);
router.get('/:id', getBatch);
router.put('/:id', protect, authorize('admin'), updateBatch);
router.delete('/:id', protect, authorize('admin'), deleteBatch);

module.exports = router;
