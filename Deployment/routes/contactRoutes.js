const express = require('express');
const router = express.Router();
const {
  submitContactForm,
  getAllContacts,
  updateContactStatus,
  deleteContact
} = require('../controllers/contactController');
const { protect, authorize } = require('../middleware/auth');

router.post('/', require('../middleware/contactRateLimit'), submitContactForm);

router.route('/')
  .get(protect, authorize('admin'), getAllContacts);

router.route('/:id')
  .put(protect, authorize('admin'), updateContactStatus)
  .delete(protect, authorize('admin'), deleteContact);

module.exports = router;
