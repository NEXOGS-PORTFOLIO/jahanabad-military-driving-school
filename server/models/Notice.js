const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a notice title'],
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  type: {
    type: String,
    enum: ['Announcement', 'Update', 'Notice'],
    required: [true, 'Please provide a notice type']
  },
  content: {
    type: String,
    required: [true, 'Please provide notice content']
  },
  excerpt: {
    type: String,
    trim: true
  },
  image: {
    public_id: String,
    url: String
  },
  publishDate: {
    type: Date,
    required: [true, 'Please provide publish date']
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Notice', noticeSchema);
