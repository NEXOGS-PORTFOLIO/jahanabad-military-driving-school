const multer = require('multer');
const path = require('path');

const types = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.pdf': 'application/pdf' };
const parse = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 2, fields: 12 },
  fileFilter: (req, file, callback) => {
    const expected = types[path.extname(file.originalname).toLowerCase()];
    if (!expected || file.mimetype !== expected) {
      return callback(new Error('Please upload only PNG, JPG, JPEG or PDF files.'));
    }
    callback(null, true);
  }
}).fields([{ name: 'nidDocument', maxCount: 1 }, { name: 'biodataDocument', maxCount: 1 }]);

const validSignature = file => {
  const data = file.buffer;
  if (file.mimetype === 'image/png') return data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (file.mimetype === 'image/jpeg') return data.length >= 3 && data[0] === 255 && data[1] === 216 && data[2] === 255;
  return data.subarray(0, 5).toString() === '%PDF-';
};

module.exports = (req, res, next) => parse(req, res, error => {
  if (error) return res.status(400).json({ success: false, message: error.code === 'LIMIT_FILE_SIZE'
    ? 'Each document must be 5 MB or smaller.' : error.message });
  const files = Object.values(req.files || {}).flat();
  if (files.length && req.body.role && req.body.role !== 'student') {
    return res.status(400).json({ success: false, message: 'Documents are only accepted for Student registration.' });
  }
  if (files.some(file => !validSignature(file))) {
    return res.status(400).json({ success: false, message: 'Document contents must match PNG, JPG, JPEG or PDF format.' });
  }
  next();
});
