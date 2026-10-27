const express = require('express');
const router = express.Router();
const {
  getReferenceCodes,
  createReferenceCode,
  deactivateReferenceCode
} = require('../controllers/referenceCodeController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(protect, authorize('admin'), getReferenceCodes)
  .post(protect, authorize('admin'), createReferenceCode);

router.patch(
  '/:id/deactivate',
  protect,
  authorize('admin'),
  deactivateReferenceCode
);

module.exports = router;
