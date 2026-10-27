const Certificate = require('../models/Certificate');
const { generateCaptcha } = require('../utils/helpers');
const { generateCertificatePDF } = require('../utils/pdfGenerator');
const { createChallenge, verifyChallenge } = require('../utils/captcha');

// @desc    Get all certificates
// @route   GET /api/certificates
// @access  Private/Admin
exports.getAllCertificates = async (req, res) => {
  try {
    const { status, student } = req.query;
    let query = {};

    if (status) query.status = status;
    if (student) query.student = student;

    const certificates = await Certificate.find(query)
      .populate('student', 'name email phone')
      .populate('course', 'title duration')
      .populate('batch', 'name batchNumber batchNo courseType startDate endDate status')
      .populate('revokedBy', 'name')
      .sort({ issuedDate: -1 });

    res.status(200).json({
      success: true,
      count: certificates.length,
      data: certificates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Verify certificate
// @route   POST /api/certificates/verify
// @access  Public
exports.verifyCertificate = async (req, res) => {
  try {
    const { certificateId, captcha, captchaToken } = req.body;

    // Verify captcha
    if (!verifyChallenge(captcha, captchaToken)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid captcha'
      });
    }

    if (typeof certificateId !== 'string' || !certificateId.trim() || certificateId.length > 100) {
      return res.status(400).json({ success: false, message: 'Invalid certificate ID' });
    }
    const certificate = await Certificate.findOne({ certificateId: certificateId.trim() })
      .populate('student', 'name email')
      .populate('course', 'title duration')
      .populate('batch', 'name batchNumber batchNo courseType');

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found',
        data: {
          status: 'Not Found',
          certificateId
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        status: certificate.status === 'valid' ? 'Valid' : 'Revoked',
        certificateId: certificate.certificateId,
        studentName: certificate.student.name,
        courseName: certificate.course.title,
        batchName: certificate.batch?.name || certificate.batch?.batchNumber,
        batchNo: certificate.batch?.batchNo,
        courseType: certificate.batch?.courseType,
        courseDuration: certificate.course.duration,
        issuedDate: certificate.issuedDate,
        revokedAt: certificate.revokedAt,
        revokeReason: certificate.revokeReason
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Generate captcha
// @route   GET /api/certificates/captcha
// @access  Public
exports.getCaptcha = async (req, res) => {
  try {
    const captcha = generateCaptcha();

    res.status(200).json({
      success: true,
      data: { captcha, captchaToken: createChallenge(captcha) }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Revoke certificate
// @route   PUT /api/certificates/:id/revoke
// @access  Private/Admin
exports.revokeCertificate = async (req, res) => {
  try {
    const { reason } = req.body;

    let certificate = await Certificate.findById(req.params.id);

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    if (certificate.status === 'revoked') {
      return res.status(400).json({
        success: false,
        message: 'Certificate already revoked'
      });
    }

    certificate.status = 'revoked';
    certificate.revokedAt = Date.now();
    certificate.revokedBy = req.user._id;
    certificate.revokeReason = reason || 'No reason provided';

    await certificate.save();

    const populatedCertificate = await Certificate.findById(certificate._id)
      .populate('student', 'name email')
      .populate('course', 'title')
      .populate('revokedBy', 'name');

    res.status(200).json({
      success: true,
      data: populatedCertificate
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get my certificates (Student)
// @route   GET /api/certificates/my-certificates
// @access  Private/Student
exports.getMyCertificates = async (req, res) => {
  try {
    const certificates = await Certificate.find({ student: req.user._id })
      .populate('course', 'title duration image')
      .populate('batch', 'name batchNumber batchNo courseType startDate endDate status')
      .sort({ issuedDate: -1 });

    res.status(200).json({
      success: true,
      count: certificates.length,
      data: certificates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get certificate by ID
// @route   GET /api/certificates/:id
// @access  Private
exports.getCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id)
      .populate('student', 'name email phone')
      .populate('course', 'title duration')
      .populate('batch', 'name batchNumber batchNo courseType')
      .populate('revokedBy', 'name');

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    // Check authorization
    if (req.user.role === 'student' && certificate.student._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this certificate'
      });
    }

    res.status(200).json({
      success: true,
      data: certificate
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Download certificate PDF
// @route   GET /api/certificates/:id/download
// @access  Private
exports.downloadCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id)
      .populate('student', 'name email')
      .populate('course', 'title duration')
      .populate('batch', 'name batchNumber batchNo courseType');

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    // Check authorization
    if (req.user.role === 'student' && certificate.student._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to download this certificate'
      });
    }

    if (certificate.status === 'revoked') {
      return res.status(400).json({
        success: false,
        message: 'Cannot download a revoked certificate'
      });
    }

    // Check if PDF is already generated
    if (certificate.pdfData) {
      const pdfBuffer = Buffer.from(certificate.pdfData, 'base64');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Certificate-${certificate.certificateId}.pdf`);
      return res.send(pdfBuffer);
    }

    // Generate PDF
    const certificateData = {
      certificateId: certificate.certificateId,
      studentName: certificate.student.name,
      courseName: certificate.course.title,
      batchName: certificate.batch?.name || certificate.batch?.batchNumber,
      courseDuration: certificate.course.duration,
      issuedDate: certificate.issuedDate
    };

    const pdfBuffer = await generateCertificatePDF(certificateData);

    // Save PDF data to certificate (base64)
    certificate.pdfData = pdfBuffer.toString('base64');
    await certificate.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Certificate-${certificate.certificateId}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get certificate PDF as base64 (for preview)
// @route   GET /api/certificates/:id/preview
// @access  Private
exports.previewCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id)
      .populate('student', 'name email')
      .populate('course', 'title duration')
      .populate('batch', 'name batchNumber batchNo courseType');

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    // Check authorization
    if (req.user.role === 'student' && certificate.student._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to preview this certificate'
      });
    }

    // Check if PDF is already generated
    if (certificate.pdfData) {
      return res.status(200).json({
        success: true,
        data: {
          pdfData: `data:application/pdf;base64,${certificate.pdfData}`,
          certificateId: certificate.certificateId
        }
      });
    }

    // Generate PDF
    const certificateData = {
      certificateId: certificate.certificateId,
      studentName: certificate.student.name,
      courseName: certificate.course.title,
      batchName: certificate.batch?.name || certificate.batch?.batchNumber,
      courseDuration: certificate.course.duration,
      issuedDate: certificate.issuedDate
    };

    const pdfBuffer = await generateCertificatePDF(certificateData);
    const pdfBase64 = pdfBuffer.toString('base64');

    // Save PDF data to certificate
    certificate.pdfData = pdfBase64;
    await certificate.save();

    res.status(200).json({
      success: true,
      data: {
        pdfData: `data:application/pdf;base64,${pdfBase64}`,
        certificateId: certificate.certificateId
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

