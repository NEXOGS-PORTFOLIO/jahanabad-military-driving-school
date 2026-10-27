const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
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
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch'
  },
  batchStatusSnapshot: String,
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'waived', 'refunded'],
    default: 'pending'
  },
  documentStatus: {
    type: String,
    enum: ['pending', 'submitted', 'verified', 'rejected'],
    default: 'pending'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending'
  },
  enrolledAt: {
    type: Date,
    default: Date.now
  },
  approvedAt: Date,
  completedAt: Date,
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  attendance: [{
    date: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late'],
      required: true
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  progressComments: [{
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true },
    progress: { type: Number, required: true, min: 0, max: 100 },
    createdAt: { type: Date, default: Date.now }
  }],
  notes: String
}, {
  timestamps: true
});

// Prevent duplicate batch enrollments while keeping old course-only data compatible.
enrollmentSchema.index(
  { student: 1, batch: 1 },
  { unique: true, partialFilterExpression: { batch: { $exists: true } } }
);

module.exports = mongoose.model('Enrollment', enrollmentSchema);
