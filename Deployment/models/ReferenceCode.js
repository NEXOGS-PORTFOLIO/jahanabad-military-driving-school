const mongoose = require('mongoose');
const crypto = require('crypto');

const referenceCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  purpose: {
    type: String,
    enum: ['instructor_registration'],
    default: 'instructor_registration'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  usedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  usedAt: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

referenceCodeSchema.statics.generateCode = function() {
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `JMDS-INS-${randomPart}`;
};

module.exports = mongoose.model('ReferenceCode', referenceCodeSchema);
