const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true
  },
  batchNo: {
    type: mongoose.Schema.Types.Mixed
  },
  batchNumber: {
    type: String,
    required: [true, 'Please provide a batch number'],
    trim: true,
    unique: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  instructors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  assignedInstructors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  courseType: {
    type: String,
    trim: true
  },
  vehicleTypes: [{
    type: String,
    trim: true
  }],
  capacity: {
    type: Number,
    required: [true, 'Please provide batch capacity'],
    min: 1,
    default: 10
  },
  enrolledCount: {
    type: Number,
    default: 0,
    min: 0
  },
  completedCount: {
    type: Number,
    default: 0,
    min: 0
  },
  officialStudentCount: {
    type: Number,
    default: 0,
    min: 0
  },
  officialCompletedCount: {
    type: Number,
    default: 0,
    min: 0
  },
  startDate: Date,
  endDate: Date,
  fee: {
    type: Number,
    min: 0
  },
  schedule: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed', 'cancelled', 'planned', 'active'],
    default: 'upcoming'
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

batchSchema.pre('validate', function(next) {
  if (!this.name && this.batchNumber) {
    this.name = this.batchNumber;
  }

  if (!this.batchNumber && this.name) {
    this.batchNumber = this.name;
  }

  if ((!this.assignedInstructors || this.assignedInstructors.length === 0) && this.instructors?.length) {
    this.assignedInstructors = this.instructors;
  }

  if ((!this.instructors || this.instructors.length === 0) && this.assignedInstructors?.length) {
    this.instructors = this.assignedInstructors;
  }

  next();
});

module.exports = mongoose.model('Batch', batchSchema);
