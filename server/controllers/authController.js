const User = require('../models/User');
const ReferenceCode = require('../models/ReferenceCode');
const { normalizePhone } = require('../utils/phone');
const { sendSMSOTP } = require('../utils/smsService');
const { generateToken, generateOTP, getOTPExpiry } = require('../utils/helpers');
const { sendOTPEmail, sendLoginNotificationEmail, sendPasswordResetEmail, sendRegistrationSuccessEmail } = require('../utils/emailService');

// SMS is best effort: the email code remains valid if the provider rejects delivery.
const trySendRegistrationSMS = async (phone, otp) => {
  try {
    await sendSMSOTP(phone, otp);
    return true;
  } catch (error) {
    console.warn('Registration SMS unavailable; email verification remains available:',
      { code: error.code || 'SMS_DELIVERY_FAILED', providerCode: error.providerCode, httpStatus: error.httpStatus });
    return false;
  }
};
const verificationMessage = smsAccepted => smsAccepted
  ? 'Verification code sent to your email and submitted for SMS delivery. You can use the email code even if the SMS does not arrive.'
  : 'Verification code sent to your email. SMS is currently unavailable; use the email code to complete registration.';

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  let reservedReferenceCode = null;

  try {
    const { name, email, phone, password, role, referenceCode, fatherName, nidNumber, gender } = req.body;

    if (role !== undefined && !['student', 'instructor'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid registration role' });
    }

    // Validate required fields
    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return res.status(400).json({ success: false, message: 'Please provide a valid Bangladesh mobile number' });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    if (role === 'instructor') {
      if (!referenceCode || !referenceCode.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Instructor reference code is required'
        });
      }

      reservedReferenceCode = await ReferenceCode.findOneAndUpdate({
        code: referenceCode.trim().toUpperCase(),
        purpose: 'instructor_registration',
        isActive: true,
        isUsed: false
      }, {
        isUsed: true,
        usedAt: Date.now()
      }, {
        new: true
      });

      if (!reservedReferenceCode) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or already used instructor reference code'
        });
      }
    }

    const studentDetails = {};
    if (!role || role === 'student') {
      if (gender !== undefined && !['male', 'female', ''].includes(gender)) {
        return res.status(400).json({ success: false, message: 'Please select a valid gender.' });
      }
      studentDetails.gender = gender || '';
      if ((fatherName !== undefined && typeof fatherName !== 'string') ||
          (nidNumber !== undefined && typeof nidNumber !== 'string')) {
        return res.status(400).json({ success: false, message: 'Student details must be text.' });
      }
      studentDetails.fatherName = fatherName;
      studentDetails.nidNumber = nidNumber;

    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpires = getOTPExpiry();

    // Create user
    const user = await User.create({
      ...studentDetails,
      name,
      email,
      phone: normalizedPhone,
      password,
      role: role || 'student',
      otp,
      otpExpires,
      otpSentAt: new Date(),
      otpAttempts: 0
    });

    // Email delivery is required; SMS delivery must not block email verification.
    try {
      await sendOTPEmail(email, otp, name);
    } catch (deliveryError) {
      console.error('Verification delivery failed:', deliveryError.code || 'EMAIL_DELIVERY_FAILED',
        { providerCode: deliveryError.providerCode, httpStatus: deliveryError.httpStatus });
      await User.findByIdAndDelete(user._id);
      if (reservedReferenceCode) {
        reservedReferenceCode.isUsed = false;
        reservedReferenceCode.usedAt = undefined;
        await reservedReferenceCode.save();
      }
      return res.status(503).json({
        success: false,
        code: 'VERIFICATION_DELIVERY_FAILED',
        message: 'Unable to send the verification email. Please try registering again.'
      });
    }

    if (reservedReferenceCode) {
      reservedReferenceCode.usedBy = user._id;
      await reservedReferenceCode.save();
    }

    const smsAccepted = await trySendRegistrationSMS(normalizedPhone, otp);
    res.status(201).json({
      success: true,
      message: verificationMessage(smsAccepted),
      smsAccepted
    });
  } catch (error) {
    if (reservedReferenceCode && !reservedReferenceCode.usedBy) {
      reservedReferenceCode.isUsed = false;
      reservedReferenceCode.usedAt = undefined;
      await reservedReferenceCode.save().catch(() => {});
    }

    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Please check your registration details, email format and password length.' });
    }
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'An account with these details already exists. Please sign in.' });
    }
    console.error('Register error:', error.name);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again or contact support.'
    });
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (typeof email !== 'string' || !email.trim() || typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ success: false, message: 'Please provide email and a six-digit verification code' });
    }

    const user = await User.findOne({ email }).select('+otp +otpExpires +otpAttempts');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'User already verified'
      });
    }

    if (!user.otp || !user.otpExpires || !(new Date(user.otpExpires).getTime() > Date.now())) {
      return res.status(400).json({ success: false, message: 'Verification code has expired or is missing. Please request a new code.' });
    }

    // Reserve an attempt atomically; parallel guesses cannot bypass the limit.
    const attempt = await User.findOneAndUpdate({
      _id: user._id, isVerified: false, otp: user.otp,
      $or: [{ otpAttempts: { $lt: 5 } }, { otpAttempts: { $exists: false } }]
    }, { $inc: { otpAttempts: 1 } }, { new: true });
    if (!attempt) {
      return res.status(429).json({ success: false, message: 'Verification limit reached or code changed. Please request a new code.' });
    }
    if (user.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid verification code' });
    }

    // Consume the OTP atomically so concurrent requests cannot send duplicate confirmations.
    const verified = await User.findOneAndUpdate({
      _id: user._id,
      isVerified: false,
      otp,
      otpExpires: { $gt: new Date() }
    }, {
      $set: { isVerified: true, status: 'active' },
      $unset: { otp: '', otpExpires: '', smsOtpHash: '', smsOtpExpires: '', otpAttempts: '', otpSentAt: '' }
    }, { new: true });
    if (!verified) {
      return res.status(400).json({ success: false, message: 'OTP has expired or already been used' });
    }

    if (user.role === 'student') {
      sendRegistrationSuccessEmail(user.email, user.name).catch(error => {
        console.error('Failed to send registration confirmation email:', error.message);
      });
      return res.status(200).json({
        success: true,
        message: 'Registration completed successfully.',
        token: generateToken(user._id),
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Registration verified successfully! You can now login.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        message: 'Please enter the verification code received by email or SMS to complete registration.',
        isUnverified: true,
        email: user.email
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Your account is not active. Please contact admin.'
      });
    }

    const token = generateToken(user._id);

    // Send login notification email (non-blocking)
    const loginInfo = {
      loginTime: new Date().toLocaleString('en-US', { 
        timeZone: 'Asia/Dhaka',
        dateStyle: 'full',
        timeStyle: 'long'
      }),
      ipAddress: req.ip || req.connection.remoteAddress || 'Unknown',
      userAgent: req.headers['user-agent'] || 'Unknown'
    };

    // Send email in background (don't wait for it)
    sendLoginNotificationEmail(user.email, user.name, loginInfo).catch(err => {
      console.error('Failed to send login notification email:', err.message);
    });

    res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide your email' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'User already verified'
      });
    }

    const phone = normalizePhone(user.phone);
    const otp = generateOTP();
    const now = new Date();
    const updated = await User.findOneAndUpdate({
      _id: user._id, isVerified: false,
      $or: [{ otpSentAt: { $lte: new Date(Date.now() - 60000) } }, { otpSentAt: { $exists: false } }]
    }, { $set: {
      otp, otpExpires: getOTPExpiry(), otpSentAt: now, otpAttempts: 0
    } }, { new: true });
    if (!updated) {
      return res.status(429).json({ success: false, message: 'Please wait 60 seconds before resending the verification code.' });
    }
    try {
      await sendOTPEmail(email, otp, user.name);
    } catch {
      return res.status(503).json({ success: false, message: 'Unable to send the verification email. Please wait 60 seconds and resend.' });
    }
    const smsAccepted = await trySendRegistrationSMS(phone, otp);
    res.status(200).json({ success: true, message: verificationMessage(smsAccepted), smsAccepted });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/me
// @access  Private
exports.updateMe = async (req, res) => {
  try {
    const { name, email, phone, gender, fatherName } = req.body;
    if (gender !== undefined && !['male', 'female', ''].includes(gender)) {
      return res.status(400).json({ success: false, message: 'Please select a valid gender.' });
    }
    if (fatherName !== undefined && typeof fatherName !== 'string') {
      return res.status(400).json({ success: false, message: 'Father’s Name must be text.' });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }
    }

    user.name = name || user.name;
    user.email = email || user.email;
    user.phone = phone || user.phone;
    if (user.role === 'student') {
      if (gender !== undefined) user.gender = gender;
      if (fatherName !== undefined) user.fatherName = fatherName.trim();
    }

    await user.save();

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Forgot password — generate and email a reset OTP
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide an email address' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      // Generic response to prevent email enumeration
      return res.status(200).json({
        success: true,
        message: 'If this email is registered, you will receive a password reset OTP shortly.'
      });
    }

    if (!user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'This account is not verified. Please verify your email first.'
      });
    }

    const otp = generateOTP();
    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpires = getOTPExpiry();
    await user.save();

    await sendPasswordResetEmail(email, otp, user.name);

    res.status(200).json({ success: true, message: 'Password reset OTP sent to your email.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify password reset OTP (before showing password form)
// @route   POST /api/auth/verify-reset-otp
// @access  Public
exports.verifyResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Please provide email and OTP' });
    }

    const user = await User.findOne({ email }).select('+resetPasswordOtp +resetPasswordOtpExpires');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.resetPasswordOtp || user.resetPasswordOtp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    if (!user.resetPasswordOtpExpires || !(new Date(user.resetPasswordOtpExpires).getTime() > Date.now())) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    res.status(200).json({ success: true, message: 'OTP verified successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset password using verified OTP
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({ email }).select('+resetPasswordOtp +resetPasswordOtpExpires');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.resetPasswordOtp || user.resetPasswordOtp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    if (!user.resetPasswordOtpExpires || !(new Date(user.resetPasswordOtpExpires).getTime() > Date.now())) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    user.password = newPassword;
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpires = undefined;
    await user.save();

    res.status(200).json({ success: true, message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (typeof currentPassword !== 'string' || !currentPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Provide your current password and a new password of at least 6 characters' });
    }

    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
