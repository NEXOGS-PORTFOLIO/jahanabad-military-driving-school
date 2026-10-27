const User = require('../models/User');
const mongoose = require('mongoose');
const Enrollment = require('../models/Enrollment');

exports.uploadEnrollmentDocuments = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid enrollment ID' });
  }
  const documents = {};
  const removals = {};
  for (const field of ['nidDocument', 'biodataDocument']) {
    const file = req.files?.[field]?.[0];
    const remove = req.body?.[`remove_${field}`];
    if (remove !== undefined && remove !== 'true') {
      return res.status(400).json({ success: false, message: 'Invalid document removal request' });
    }
    if (remove === 'true' && file) {
      return res.status(400).json({ success: false, message: 'Cannot upload and remove the same document' });
    }
    if (remove === 'true') removals[field] = 1;
    if (file) documents[field] = { filename: file.originalname, contentType: file.mimetype, data: file.buffer };
  }
  if (!Object.keys(documents).length && !Object.keys(removals).length) {
    return res.status(400).json({ success: false, message: 'Please choose at least one document.' });
  }
  try {
    const enrollment = await Enrollment.findById(req.params.id).select('student');
    if (!enrollment) return res.status(404).json({ success: false, message: 'Enrollment not found' });
    const update = {};
    if (Object.keys(documents).length) update.$set = documents;
    if (Object.keys(removals).length) update.$unset = removals;
    const student = await User.findOneAndUpdate({ _id: enrollment.student, role: 'student' }, update);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, message: 'Student documents uploaded successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to upload student documents' });
  }
};

const validId = (req, res) => {
  if (mongoose.isValidObjectId(req.params.id)) return true;
  res.status(400).json({ success: false, message: 'Invalid student ID' });
  return false;
};

exports.getStudentProfile = async (req, res) => {
  if (!validId(req, res)) return;
  try {
    const student = await User.findOne({ _id: req.params.id, role: 'student' })
      .select('+nidDocument +biodataDocument -nidDocument.data -biodataDocument.data').lean();
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    const documents = {};
    for (const field of ['nidDocument', 'biodataDocument']) {
      const document = student[field];
      documents[field] = document ? { filename: document.filename, contentType: document.contentType } : null;
      delete student[field];
    }
    res.set('Cache-Control', 'no-store');
    res.json({ success: true, data: { ...student, documents } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to load student profile' });
  }
};

exports.getStudentDocument = async (req, res) => {
  if (!validId(req, res)) return;
  const field = req.params.document;
  if (!['nidDocument', 'biodataDocument'].includes(field)) {
    return res.status(400).json({ success: false, message: 'Invalid document type' });
  }
  try {
    const student = await User.findOne({ _id: req.params.id, role: 'student' }).select(`+${field}`);
    const document = student?.[field];
    if (!document?.data) return res.status(404).json({ success: false, message: 'Document not submitted' });
    const contentType = document.contentType;
    if (!['image/png', 'image/jpeg', 'application/pdf'].includes(contentType)) {
      return res.status(400).json({ success: false, message: 'Unsupported document format' });
    }
    const filename = encodeURIComponent(document.filename || field).replace(/'/g, '%27');
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `${req.query.download === '1' ? 'attachment' : 'inline'}; filename*=UTF-8''${filename}`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    res.send(document.data);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to load student document' });
  }
};
