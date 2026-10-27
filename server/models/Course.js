const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a course title'],
    trim: true,
    unique: true
  },
  description: {
    type: String,
    required: [true, 'Please provide a course description']
  },
  duration: {
    type: String,
    required: [true, 'Please provide course duration']
  },
  price: {
    type: Number,
    required: [true, 'Please provide course price'],
    min: 0
  },
  category: {
    type: String,
    default: 'Driving'
  },
  vehicleTypes: [{
    type: String,
    trim: true
  }],
  capacity: {
    type: Number,
    min: 0
  },
  image: {
    public_id: String,
    url: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Course', courseSchema);
