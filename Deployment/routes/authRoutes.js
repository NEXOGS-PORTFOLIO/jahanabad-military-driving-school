const express = require('express');
const router = express.Router();
const {
  register,
  verifyOTP,
  login,
  getMe,
  resendOTP,
  updateMe,
  changePassword,
  forgotPassword,
  verifyResetOTP,
  resetPassword
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const registrationRateLimit = require('../middleware/registrationRateLimit');
const authRateLimit = require('../middleware/authRateLimit');

router.post('/register', registrationRateLimit, register);
router.post('/verify-otp', authRateLimit, verifyOTP);
router.post('/login', authRateLimit, login);
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.put('/change-password', protect, changePassword);
router.post('/resend-otp', registrationRateLimit, resendOTP);
router.post('/forgot-password', authRateLimit, forgotPassword);
router.post('/verify-reset-otp', authRateLimit, verifyResetOTP);
router.post('/reset-password', authRateLimit, resetPassword);

module.exports = router;
