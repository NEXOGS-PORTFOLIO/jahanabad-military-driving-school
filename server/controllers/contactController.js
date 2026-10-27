const Contact = require('../models/Contact');
const { validateContact, normalizeContact } = require('../utils/contactValidation');
const { sendContactEmail } = require('../utils/emailService');

// @desc    Submit contact form
// @route   POST /api/contact
// @access  Public
exports.submitContactForm = async (req, res) => {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['name', 'email', 'phone', 'message'].includes(key))) {
      return res.status(400).json({ success: false, message: 'Please submit only name, email, phone and message fields.' });
    }
    const errors = validateContact(body);
    if (Object.keys(errors).length) {
      return res.status(400).json({ success: false, message: 'Please correct the highlighted fields.', errors });
    }
    const { name, email, phone, message } = normalizeContact(body);

    // Create contact record
    const contact = await Contact.create({
      name,
      email,
      phone,
      message
    });

    // Send email to admin
    try {
      await sendContactEmail({ name, email, phone, message });
    } catch (emailError) {
      console.error('Contact email delivery failed:', { code: emailError.code || 'EMAIL_DELIVERY_FAILED' });
      return res.status(503).json({
        success: false,
        code: 'CONTACT_EMAIL_FAILED',
        message: 'Your message was saved, but the email could not be sent. Please try again later or call 01769-564999.'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully! We will get back to you soon.',
      data: { id: contact._id }
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: 'Please check your contact details.' });
    }
    console.error('Contact submission failed:', error.name);
    res.status(500).json({ success: false, message: 'Unable to send your message. Please try again.' });
  }
};

// @desc    Get all contact submissions
// @route   GET /api/contact
// @access  Private/Admin
exports.getAllContacts = async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};

    if (status) query.status = status;

    const contacts = await Contact.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: contacts.length,
      data: contacts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update contact status
// @route   PUT /api/contact/:id
// @access  Private/Admin
exports.updateContactStatus = async (req, res) => {
  try {
    const { status } = req.body;

    let contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    contact.status = status;
    await contact.save();

    res.status(200).json({
      success: true,
      data: contact
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete contact
// @route   DELETE /api/contact/:id
// @access  Private/Admin
exports.deleteContact = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    await Contact.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Contact deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
