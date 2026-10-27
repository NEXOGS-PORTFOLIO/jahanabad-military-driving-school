const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

// Load env vars
dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('MongoDB Connected');

    // Check if admin exists
    const adminExists = await User.findOne({ role: 'admin' });

    if (adminExists) {
      console.log('Admin already exists');
      process.exit();
    }

    // Create admin user
    const admin = await User.create({
      name: 'Admin',
      email: 'admin@jmds.com',
      phone: '01700000000',
      password: 'admin123',
      role: 'admin',
      isVerified: true,
      status: 'active'
    });

    console.log('Admin created successfully');
    console.log('Email: admin@jmds.com');
    console.log('Password: admin123');

    process.exit();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

seedAdmin();
