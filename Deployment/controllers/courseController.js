const Course = require('../models/Course');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');

// @desc    Get all courses
// @route   GET /api/courses
// @access  Public
exports.getAllCourses = async (req, res) => {
  try {
    console.log('GET /api/courses - Request received');
    const { category, search, isActive } = req.query;
    let query = {};

    if (category) query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (isActive !== undefined) query.isActive = isActive === 'true';

    console.log('Query:', query);
    const courses = await Course.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    console.log('Courses found:', courses.length);
    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses
    });
  } catch (error) {
    console.error('Error in getAllCourses:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single course
// @route   GET /api/courses/:id
// @access  Public
exports.getCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('createdBy', 'name email');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.status(200).json({
      success: true,
      data: course
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create course
// @route   POST /api/courses
// @access  Private/Admin
exports.createCourse = async (req, res) => {
  try {
    const { title, description, duration, price, category } = req.body;

    // Check if course exists
    const courseExists = await Course.findOne({ title });
    if (courseExists) {
      return res.status(400).json({
        success: false,
        message: 'Course with this title already exists'
      });
    }

    let imageData = {};
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'jmds/courses');
      imageData = {
        public_id: result.public_id,
        url: result.url
      };
    }

    const course = await Course.create({
      title,
      description,
      duration,
      price,
      category,
      image: imageData,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      data: course
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private/Admin
exports.updateCourse = async (req, res) => {
  try {
    let course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const { title, description, duration, price, category, isActive } = req.body;

    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (duration) updateData.duration = duration;
    if (price !== undefined) updateData.price = price;
    if (category) updateData.category = category;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Handle image upload
    if (req.file) {
      // Delete old image if exists
      if (course.image && course.image.public_id) {
        await deleteFromCloudinary(course.image.public_id);
      }

      // Upload new image
      const result = await uploadToCloudinary(req.file.buffer, 'jmds/courses');
      updateData.image = {
        public_id: result.public_id,
        url: result.url
      };
    }

    course = await Course.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: course
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private/Admin
exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Delete image from Cloudinary if exists
    if (course.image && course.image.public_id) {
      await deleteFromCloudinary(course.image.public_id);
    }

    await Course.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Toggle course status
// @route   PATCH /api/courses/:id/toggle-status
// @access  Private/Admin
exports.toggleCourseStatus = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    course.isActive = !course.isActive;
    await course.save();

    res.status(200).json({
      success: true,
      data: course
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
