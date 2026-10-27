const mongoose = require('mongoose');
const { allocateCertificateId } = require('../utils/certificateId');

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
  },
  pdfFingerprint: String
}, {
  timestamps: true
});

// Allocate before required-field validation, and never replace an existing ID.
certificateSchema.pre('validate', async function() {
  if (this.isNew && !this.certificateId) {
    this.certificateId = await allocateCertificateId(this.constructor);
  }
});

module.exports = mongoose.model('Certificate', certificateSchema);
