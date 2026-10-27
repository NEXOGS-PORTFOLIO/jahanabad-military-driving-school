const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Certificate = require('../models/Certificate');

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error('Error connecting to MongoDB:', err.message);
    process.exit(1);
  }
};

const createCertificates = async () => {
  try {
    await connectDB();

    // Find completed enrollments without certificates
    const completedEnrollments = await Enrollment.find({ 
      status: 'completed'
    }).populate('student course');

    console.log(`Found ${completedEnrollments.length} completed enrollments`);

    for (const enrollment of completedEnrollments) {
      // Check if certificate already exists
      const existingCert = await Certificate.findOne({ enrollment: enrollment._id });
      
      if (!existingCert) {

        const certificate = await Certificate.create({
          student: enrollment.student._id,
          course: enrollment.course._id,
          enrollment: enrollment._id,
          status: 'valid'
        });

        console.log(`Certificate created for ${enrollment.student.name} - ${enrollment.course.title}`);
        console.log(`Certificate ID: ${certificate.certificateId}`);
      } else {
        console.log(`Certificate already exists for ${enrollment.student.name} - ${enrollment.course.title}`);
        console.log(`Certificate ID: ${existingCert.certificateId}`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error creating certificates:', error);
    process.exit(1);
  }
};

createCertificates();
