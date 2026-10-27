const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

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

const seedInstructor = async () => {
  try {
    await connectDB();

    const instructorExists = await User.findOne({ email: 'instructor@jmds.com' });
    
    if (instructorExists) {
      console.log('Instructor already exists');
      process.exit(0);
    }

    const instructor = await User.create({
      name: 'Instructor Khan',
      email: 'instructor@jmds.com',
      password: 'instructor123',
      phone: '01712345679',
      role: 'instructor',
      isVerified: true,
      status: 'active'
    });

    console.log('\n=== Instructor Account Created ===');
    console.log('Email: instructor@jmds.com');
    console.log('Password: instructor123');
    console.log('===================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding instructor:', error);
    process.exit(1);
  }
};

seedInstructor();
