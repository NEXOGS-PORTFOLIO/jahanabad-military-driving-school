const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const Certificate = require('../models/Certificate');
const Batch = require('../models/Batch');
const buildEnrollmentConfirmation = require('../utils/enrollmentConfirmation');
const { sendEnrollmentConfirmationEmail } = require('../utils/emailService');

const batchSelect = 'name batchNumber batchNo capacity schedule status startDate endDate courseType vehicleTypes fee enrolledCount completedCount officialStudentCount officialCompletedCount';

const syncBatchCounts = async (batchId) => {
  const batch = await Batch.findById(batchId).select('officialStudentCount officialCompletedCount');
  if (!batch) return null;

  const [liveEnrolledCount, liveCompletedCount] = await Promise.all([
    Enrollment.countDocuments({ batch: batchId, status: { $in: ['approved', 'completed'] } }),
    Enrollment.countDocuments({ batch: batchId, status: 'completed' })
  ]);

  const counts = {
    enrolledCount: Math.max(liveEnrolledCount, batch.officialStudentCount || 0),
    completedCount: Math.max(liveCompletedCount, batch.officialCompletedCount || 0)
  };

  await Batch.findByIdAndUpdate(batchId, counts);
  return counts;
};

// @desc    Get all enrollments
// @route   GET /api/enrollments
// @access  Private/Admin
exports.getAllEnrollments = async (req, res) => {
  try {
    const { status, course, student } = req.query;
    let query = {};

    if (status) query.status = status;
    if (course) query.course = course;
    if (student) query.student = student;

    const enrollments = await Enrollment.find(query)
      .populate('student', 'name email phone')
      .populate('course', 'title duration price')
      .populate('instructor', 'name email')
      .populate({
        path: 'batch',
        select: `${batchSelect} course instructors assignedInstructors`,
        populate: [
          { path: 'course', select: 'title' },
          { path: 'instructors', select: 'name email' }
        ]
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: enrollments.length,
      data: enrollments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get enrollment by ID
// @route   GET /api/enrollments/:id
// @access  Private
exports.getEnrollment = async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id)
      .populate('student', 'name email phone avatar')
      .populate('course', 'title duration price description')
      .populate('instructor', 'name email phone')
      .populate('batch', batchSelect)
      .populate('attendance.markedBy', 'name');

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Check authorization
    if ((req.user.role === 'student' && enrollment.student?._id.toString() !== req.user._id.toString()) ||
        (req.user.role === 'instructor' && enrollment.instructor?._id.toString() !== req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this enrollment'
      });
    }

    res.status(200).json({
      success: true,
      data: enrollment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create enrollment
// @route   POST /api/enrollments
// @access  Private/Student
exports.createEnrollment = async (req, res) => {
  try {
    const { course, batch } = req.body;
    let courseId = course;
    let selectedBatch = null;

    if (batch) {
      selectedBatch = await Batch.findById(batch);
      if (!selectedBatch || !selectedBatch.isPublished) {
        return res.status(404).json({
          success: false,
          message: 'Batch not found or unavailable'
        });
      }

      const batchStatus = selectedBatch.status === 'planned' ? 'upcoming' : selectedBatch.status === 'active' ? 'ongoing' : selectedBatch.status;
      if (!['upcoming', 'ongoing'].includes(batchStatus)) {
        return res.status(400).json({
          success: false,
          message: 'Enrollment is only available for upcoming or ongoing batches'
        });
      }

      courseId = selectedBatch.course;
    }

    // Check if course exists and is active
    const courseExists = await Course.findById(courseId);
    if (!courseExists || !courseExists.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or inactive'
      });
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne(batch ? {
      student: req.user._id,
      batch
    } : {
      student: req.user._id,
      course: courseId,
      batch: { $exists: false }
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: batch ? 'You are already enrolled in this batch' : 'You are already enrolled in this course'
      });
    }

    const enrollment = await Enrollment.create({
      student: req.user._id,
      course: courseId,
      batch: batch || undefined,
      batchStatusSnapshot: selectedBatch ? selectedBatch.status : undefined
    });

    const populatedEnrollment = await Enrollment.findById(enrollment._id)
      .populate('course', 'title duration price')
      .populate('batch', 'name batchNumber batchNo courseType vehicleTypes startDate endDate capacity status fee');

    const confirmation = buildEnrollmentConfirmation(req.user.name, courseExists.title);
    sendEnrollmentConfirmationEmail(req.user.email, confirmation).catch(error => {
      console.error('Failed to send enrollment confirmation email:', error.message);
    });

    res.status(201).json({
      success: true,
      data: populatedEnrollment,
      confirmation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update enrollment status
// @route   PUT /api/enrollments/:id/status
// @access  Private/Admin/Instructor
exports.updateEnrollmentStatus = async (req, res) => {
  try {
    const { status, instructor, batch } = req.body;

    let enrollment = await Enrollment.findById(req.params.id);

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Instructors can only mark as completed, and only their own students
    if (req.user.role === 'instructor') {
      if (status !== 'completed') {
        return res.status(403).json({
          success: false,
          message: 'Instructors can only mark enrollments as completed'
        });
      }
      if (!enrollment.instructor || enrollment.instructor.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own students'
        });
      }
    }

    const previousStatus = enrollment.status;
    enrollment.status = status;

    if (status === 'approved') {
      enrollment.approvedAt = Date.now();
      if (instructor) {
        enrollment.instructor = instructor;
      }
      const approvalBatch = batch || enrollment.batch;
      if (approvalBatch) {
        const selectedBatch = await Batch.findById(approvalBatch);

        if (!selectedBatch) {
          return res.status(404).json({
            success: false,
            message: 'Batch not found'
          });
        }

        const batchStatus = selectedBatch.status === 'planned' ? 'upcoming' : selectedBatch.status === 'active' ? 'ongoing' : selectedBatch.status;
        if (!['upcoming', 'ongoing'].includes(batchStatus)) {
          return res.status(400).json({
            success: false,
            message: 'Selected batch is not open for approval'
          });
        }

        const assignedCount = await Enrollment.countDocuments({
          batch: approvalBatch,
          _id: { $ne: enrollment._id },
          status: { $in: ['approved', 'completed'] }
        });

        if (assignedCount >= selectedBatch.capacity) {
          return res.status(400).json({
            success: false,
            message: 'Selected batch has no vacancies'
          });
        }

        enrollment.batch = approvalBatch;
        enrollment.batchStatusSnapshot = selectedBatch.status;

        if (!instructor && selectedBatch.instructors.length > 0) {
          enrollment.instructor = selectedBatch.instructors[0];
        }
      }
    }

    if (status === 'completed') {
      enrollment.completedAt = Date.now();
      enrollment.progress = 100;

      const existingCertificate = await Certificate.findOne({
        enrollment: enrollment._id
      });

      if (!existingCertificate) {
        const timestamp = Date.now().toString(36);
        const randomStr = require('crypto').randomBytes(4).toString('hex').toUpperCase();
        const certificateId = `JMDS-${timestamp}-${randomStr}`;

        await Certificate.create({
          certificateId,
          student: enrollment.student,
          course: enrollment.course,
          batch: enrollment.batch,
          enrollment: enrollment._id
        });
      }
    }

    await enrollment.save();

    if (previousStatus !== status && enrollment.batch) {
      await syncBatchCounts(enrollment.batch);
    }

    const populatedEnrollment = await Enrollment.findById(enrollment._id)
      .populate('student', 'name email phone')
      .populate('course', 'title duration price')
      .populate('instructor', 'name email')
      .populate('batch', batchSelect);

    res.status(200).json({
      success: true,
      data: populatedEnrollment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Mark attendance
// @route   POST /api/enrollments/:id/attendance
// @access  Private/Instructor
exports.markAttendance = async (req, res) => {
  try {
    const { date, status } = req.body;

    const enrollment = await Enrollment.findById(req.params.id);

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Check if instructor is assigned to this enrollment
    if (req.user.role === 'instructor' &&
        (!enrollment.instructor ||
        enrollment.instructor.toString() !== req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to mark attendance for this enrollment'
      });
    }

    enrollment.attendance.push({
      date: date || Date.now(),
      status,
      markedBy: req.user._id
    });

    await enrollment.save();

    res.status(200).json({
      success: true,
      data: enrollment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update progress
// @route   PUT /api/enrollments/:id/progress
// @access  Private/Instructor
exports.updateProgress = async (req, res) => {
  try {
    const { comment } = req.body;
    const progress = Number(req.body.progress);
    if (!['number', 'string'].includes(typeof req.body.progress) || String(req.body.progress).trim() === '' || !Number.isFinite(progress) || progress < 0 || progress > 100) {
      return res.status(400).json({ success: false, message: 'Progress must be between 0 and 100' });
    }
    if (comment !== undefined && (typeof comment !== 'string' || comment.trim().length > 2000)) {
      return res.status(400).json({ success: false, message: 'Comment must be text with at most 2,000 characters' });
    }

    let enrollment = await Enrollment.findById(req.params.id);

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Check if instructor is assigned to this enrollment
    if (req.user.role === 'instructor' &&
        (!enrollment.instructor ||
        enrollment.instructor.toString() !== req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update progress for this enrollment'
      });
    }

    enrollment.progress = progress;

    if (comment?.trim()) {
      enrollment.progressComments.push({
        text: comment.trim(),
        author: req.user._id,
        authorName: req.user.name,
        progress,
        createdAt: new Date()
      });
    }

    // If progress is 100%, automatically mark as completed and generate certificate
    if (progress >= 100) {
      enrollment.status = 'completed';
      enrollment.completedAt = Date.now();
      enrollment.progress = 100;

      // Check if certificate already exists
      const existingCertificate = await Certificate.findOne({ 
        enrollment: enrollment._id 
      });

      if (!existingCertificate) {
        // Generate certificate with unique ID
        const timestamp = Date.now().toString(36);
        const randomStr = require('crypto').randomBytes(4).toString('hex').toUpperCase();
        const certificateId = `JMDS-${timestamp}-${randomStr}`;

        await Certificate.create({
          certificateId,
          student: enrollment.student,
          course: enrollment.course,
          batch: enrollment.batch,
          enrollment: enrollment._id
        });
      }
    }

    await enrollment.save();

    if (enrollment.batch) {
      await syncBatchCounts(enrollment.batch);
    }

    const populatedEnrollment = await Enrollment.findById(enrollment._id)
      .populate('student', 'name email phone')
      .populate('course', 'title duration price')
      .populate('instructor', 'name email')
      .populate('batch', batchSelect);

    res.status(200).json({
      success: true,
      data: populatedEnrollment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get my enrollments (Student)
// @route   GET /api/enrollments/my-enrollments
// @access  Private/Student
exports.getMyEnrollments = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ student: req.user._id })
      .populate('course', 'title duration price image')
      .populate('instructor', 'name email phone')
      .populate('batch', batchSelect)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: enrollments.length,
      data: enrollments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get instructor's assigned enrollments
// @route   GET /api/enrollments/my-students
// @access  Private/Instructor
exports.getMyStudents = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ instructor: req.user._id })
      .populate('student', 'name email phone avatar')
      .populate('course', 'title duration')
      .populate('batch', batchSelect)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: enrollments.length,
      data: enrollments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get instructor's assigned courses with student counts
// @route   GET /api/enrollments/my-courses
// @access  Private/Instructor
exports.getMyCourses = async (req, res) => {
  try {
    // Get all enrollments for this instructor
    const enrollments = await Enrollment.find({ instructor: req.user._id })
      .populate('course')
      .populate('student', 'name email')
      .populate('batch', batchSelect);


    // Group by course
    const coursesMap = {};
    enrollments.forEach(enrollment => {
      if (enrollment.course) {
        const courseId = enrollment.course._id.toString();
        if (!coursesMap[courseId]) {
          coursesMap[courseId] = {
            ...enrollment.course.toObject(),
            enrollments: [],
            batches: {}
          };
        }
        coursesMap[courseId].enrollments.push(enrollment);
        if (enrollment.batch) {
          const batchId = enrollment.batch._id.toString();
          if (!coursesMap[courseId].batches[batchId]) {
            coursesMap[courseId].batches[batchId] = {
              ...enrollment.batch.toObject(),
              enrollments: []
            };
          }
          coursesMap[courseId].batches[batchId].enrollments.push(enrollment);
        }
      }
    });

    const courses = Object.values(coursesMap).map(course => ({
      ...course,
      batches: Object.values(course.batches)
    }));

    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get enrollments for a specific course
// @route   GET /api/enrollments/course/:courseId
// @access  Private/Instructor
exports.getEnrollmentsByCourse = async (req, res) => {
  try {
    const query = { course: req.params.courseId };
    if (req.user.role === 'instructor') query.instructor = req.user._id;
    if (req.query.batch) query.batch = req.query.batch;

    const enrollments = await Enrollment.find(query)
      .populate('student', 'name email phone avatar')
      .populate('course', 'title duration')
      .populate('batch', batchSelect)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: enrollments.length,
      data: enrollments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Mark attendance for multiple students
// @route   POST /api/enrollments/attendance/bulk
// @access  Private/Instructor
exports.bulkMarkAttendance = async (req, res) => {
  try {
    const { attendance } = req.body; // Array of {enrollmentId, date, status}

    const results = [];
    for (const item of attendance) {
      const enrollment = await Enrollment.findById(item.enrollmentId);
      
      if (enrollment && (req.user.role === 'admin' || (enrollment.instructor && enrollment.instructor.toString() === req.user._id.toString()))) {
        enrollment.attendance.push({
          date: item.date || Date.now(),
          status: item.status,
          markedBy: req.user._id
        });
        await enrollment.save();
        results.push({ enrollmentId: item.enrollmentId, success: true });
      } else {
        results.push({ enrollmentId: item.enrollmentId, success: false });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Attendance marked',
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
