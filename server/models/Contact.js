const mongoose = require('mongoose');
const { validateContact } = require('../utils/contactValidation');
const fieldValidator = field => ({
  validator: value => !validateContact({ [field]: value })[field],
  message: `Please provide a valid ${field}`
});

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
    minlength: 3,
    maxlength: 100,
    validate: fieldValidator('name')
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    trim: true,
    lowercase: true,
    maxlength: 254,
    validate: fieldValidator('email')
  },
  phone: {
    type: String,
    required: [true, 'Please provide a mobile number'],
    trim: true,
    maxlength: 25,
    validate: fieldValidator('phone')
  },
  message: {
    type: String,
    required: [true, 'Please provide a message'],
    trim: true,
    validate: fieldValidator('message')
  },
  status: {
    type: String,
    enum: ['new', 'read', 'replied'],
    default: 'new'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Contact', contactSchema);
