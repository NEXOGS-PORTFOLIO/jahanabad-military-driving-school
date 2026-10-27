const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/, 'Please provide a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Please provide a phone number'],
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['student', 'instructor', 'admin'],
    default: 'student'
  },
  fatherName: { type: String, trim: true },
  gender: { type: String, enum: ['male', 'female', ''], default: '' },
  nidNumber: { type: String, trim: true },
  nidDocument: { type: new mongoose.Schema({
    filename: String, contentType: String, data: Buffer
  }, { _id: false }), select: false },
  biodataDocument: { type: new mongoose.Schema({
    filename: String, contentType: String, data: Buffer
  }, { _id: false }), select: false },
  isVerified: {
    type: Boolean,
    default: false
  },
  otp: {
    type: String,
    select: false
  },
  otpExpires: {
    type: Date,
    select: false
  },
  phoneVerified: { type: Boolean, default: false },
  smsOtpHash: { type: String, select: false },
  smsOtpExpires: { type: Date, select: false },
  otpAttempts: { type: Number, default: 0, select: false },
  otpSentAt: { type: Date, select: false },
  resetPasswordOtp: {
    type: String,
    select: false
  },
  resetPasswordOtpExpires: {
    type: Date,
    select: false
  },
  avatar: {
    public_id: String,
    url: String
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'inactive'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password before saving
// select:false does not hide fields on newly created or explicitly selected documents.
userSchema.set('toJSON', {
  transform: (document, result) => {
    for (const field of ['nidDocument', 'biodataDocument', 'password', 'otp', 'otpExpires', 'smsOtpHash', 'smsOtpExpires',
      'otpAttempts', 'otpSentAt', 'resetPasswordOtp', 'resetPasswordOtpExpires']) {
      delete result[field];
    }
    return result;
  }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
