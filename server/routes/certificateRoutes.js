const express = require('express');
const router = express.Router();
const {
  getAllCertificates,
  verifyCertificate,
  getCaptcha,
  revokeCertificate,
  getMyCertificates,
  getCertificate,
  downloadCertificate,
  previewCertificate
} = require('../controllers/certificateController');
const { protect, authorize } = require('../middleware/auth');

router.get('/captcha', getCaptcha);
router.post('/verify', verifyCertificate);
router.get('/my-certificates', protect, authorize('student'), getMyCertificates);

router.route('/')
  .get(protect, authorize('admin'), getAllCertificates);

router.route('/:id')
  .get(protect, authorize('admin', 'student'), getCertificate);

router.get('/:id/download', protect, authorize('admin', 'student'), downloadCertificate);
router.get('/:id/preview', protect, authorize('admin', 'student'), previewCertificate);

router.put('/:id/revoke', protect, authorize('admin'), revokeCertificate);

module.exports = router;
