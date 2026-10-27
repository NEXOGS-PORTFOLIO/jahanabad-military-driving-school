const ReferenceCode = require('../models/ReferenceCode');

// @desc    Get all instructor reference codes
// @route   GET /api/reference-codes
// @access  Private/Admin
exports.getReferenceCodes = async (req, res) => {
  try {
    const codes = await ReferenceCode.find()
      .populate('createdBy', 'name email')
      .populate('usedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: codes.length,
      data: codes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Generate instructor reference code
// @route   POST /api/reference-codes
// @access  Private/Admin
exports.createReferenceCode = async (req, res) => {
  try {
    const { notes } = req.body;

    let code;
    let exists = true;

    while (exists) {
      code = ReferenceCode.generateCode();
      exists = await ReferenceCode.findOne({ code });
    }

    const referenceCode = await ReferenceCode.create({
      code,
      notes,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      data: referenceCode
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Deactivate unused instructor reference code
// @route   PATCH /api/reference-codes/:id/deactivate
// @access  Private/Admin
exports.deactivateReferenceCode = async (req, res) => {
  try {
    const referenceCode = await ReferenceCode.findById(req.params.id);

    if (!referenceCode) {
      return res.status(404).json({
        success: false,
        message: 'Reference code not found'
      });
    }

    if (referenceCode.isUsed) {
      return res.status(400).json({
        success: false,
        message: 'Used reference codes cannot be deactivated'
      });
    }

    referenceCode.isActive = false;
    await referenceCode.save();

    res.status(200).json({
      success: true,
      data: referenceCode
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
