const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Course = require('../models/Course');
const User = require('../models/User');

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

const seedCourses = async () => {
  try {
    await connectDB();

    // Find admin user to set as creator
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.log('Please run seedAdmin.js first to create an admin user');
      process.exit(1);
    }

    // Clear existing courses
    await Course.deleteMany({});
    console.log('Cleared existing courses');

    // Sample courses
    const courses = [
      {
        title: 'Basic Driving License Course',
        description: 'Complete basic driving training for car license. Learn traffic rules, road safety, and practical driving skills.',
        duration: '2 months',
        price: 15000,
        category: 'Basic',
        isActive: true,
        createdBy: admin._id
      },
      {
        title: 'Heavy Vehicle Driving Course',
        description: 'Professional training for heavy vehicle operation including trucks and buses.',
        duration: '3 months',
        price: 25000,
        category: 'Heavy Vehicle',
        isActive: true,
        createdBy: admin._id
      },
      {
        title: 'Motorcycle Riding Course',
        description: 'Complete motorcycle riding training with safety guidelines and practical sessions.',
        duration: '1 month',
        price: 8000,
        category: 'Motorcycle',
        isActive: true,
        createdBy: admin._id
      },
      {
        title: 'Advanced Defensive Driving',
        description: 'Advanced course focusing on defensive driving techniques and emergency handling.',
        duration: '1 month',
        price: 12000,
        category: 'Advanced',
        isActive: true,
        createdBy: admin._id
      }
    ];

    // Create courses
    const createdCourses = await Course.insertMany(courses);
    console.log(`${createdCourses.length} courses created successfully`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding courses:', error);
    process.exit(1);
  }
};

seedCourses();
