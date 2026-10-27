const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Certificate = require('../models/Certificate');

// Load env vars
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error('Error connecting to MongoDB:', err.message);
    process.exit(1);
  }
};

const seedTestStudent = async () => {
  try {
    await connectDB();

    // Create test student
    const studentExists = await User.findOne({ email: 'student@test.com' });
    
    let student;
    if (studentExists) {
      student = studentExists;
      console.log('Test student already exists');
    } else {
      student = await User.create({
        name: 'Test Student',
        email: 'student@test.com',
        password: 'student123',
        phone: '01712345678',
        role: 'student',
        isVerified: true,
        status: 'active'
      });
      console.log('Test student created successfully');
    }

    // Get some courses
    const courses = await Course.find().limit(2);
    
    if (courses.length === 0) {
      console.log('No courses available. Please run seedCourses.js first.');
      process.exit(1);
    }

    // Find admin for approvals
    const admin = await User.findOne({ role: 'admin' });
    const instructor = await User.findOne({ role: 'instructor' });

    // Create enrollments
    for (let i = 0; i < courses.length; i++) {
      const course = courses[i];
      
      // Check if enrollment exists
      const existingEnrollment = await Enrollment.findOne({
        student: student._id,
        course: course._id
      });

      if (!existingEnrollment) {
        let enrollmentData = {
          student: student._id,
          course: course._id,
          status: i === 0 ? 'approved' : 'pending',
        };

        if (i === 0 && instructor) {
          enrollmentData.instructor = instructor._id;
          enrollmentData.approvedAt = new Date();
          enrollmentData.progress = 75;
        }

        const enrollment = await Enrollment.create(enrollmentData);
        console.log(`Enrollment created for ${course.title} - Status: ${enrollmentData.status}`);

        // Create certificate for completed enrollment
        if (i === 0 && enrollmentData.status === 'approved') {
          // Update enrollment to completed for first course
          enrollment.status = 'completed';
          enrollment.completedAt = new Date();
          enrollment.progress = 100;
          await enrollment.save();

          // Generate certificate ID manually

          const certificate = await Certificate.create({
            student: student._id,
            course: course._id,
            enrollment: enrollment._id,
            status: 'valid'
          });
          console.log(`Certificate created: ${certificate.certificateId}`);
        }
      } else {
        console.log(`Enrollment already exists for ${course.title}`);
      }
    }

    console.log('\n=== Test Student Account ===');
    console.log('Email: student@test.com');
    console.log('Password: student123');
    console.log('============================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding test student:', error);
    process.exit(1);
  }
};

seedTestStudent();
