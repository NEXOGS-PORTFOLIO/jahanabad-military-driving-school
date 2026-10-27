const mongoose = require('mongoose');
const crypto = require('crypto');

const certificateSchema = new mongoose.Schema({
  certificateId: {
    type: String,
    required: true,
    unique: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch'
  },
  enrollment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Enrollment',
    required: true
  },
  issuedDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['valid', 'revoked'],
    default: 'valid'
  },
  revokedAt: Date,
  revokedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  revokeReason: String,
  pdfData: {
    type: String // Base64 encoded PDF
  }
}, {
  timestamps: true
});

// Generate unique certificate ID before saving
certificateSchema.pre('save', function(next) {
  if (!this.certificateId) {
    const timestamp = Date.now().toString(36);
    const randomStr = crypto.randomBytes(4).toString('hex').toUpperCase();
    this.certificateId = `JMDS-${timestamp}-${randomStr}`;
  }
  next();
});

module.exports = mongoose.model('Certificate', certificateSchema);
