const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Course = require('../models/Course');
const Batch = require('../models/Batch');

dotenv.config();

const QA_PASSWORD = 'Test@12345';

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  next.setHours(0, 0, 0, 0);
  return next;
};

const ensureUser = async ({ name, email, phone, role }) => {
  let user = await User.findOne({ email }).select('+password');

  if (!user) {
    user = new User({
      name,
      email,
      phone,
      password: QA_PASSWORD,
      role,
      isVerified: true,
      status: 'active'
    });
  } else {
    user.name = name;
    user.phone = phone;
    user.role = role;
    user.isVerified = true;
    user.status = 'active';
    user.password = QA_PASSWORD;
  }

  await user.save();
  return user;
};

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');

    const admin = await ensureUser({
      name: 'QA Admin',
      email: 'qa.admin@jmds.test',
      phone: '01700000001',
      role: 'admin'
    });

    const instructor = await ensureUser({
      name: 'QA Instructor',
      email: 'qa.instructor@jmds.test',
      phone: '01700000002',
      role: 'instructor'
    });

    await ensureUser({
      name: 'QA Student One',
      email: 'qa.student1@jmds.test',
      phone: '01700000003',
      role: 'student'
    });

    await ensureUser({
      name: 'QA Student Two',
      email: 'qa.student2@jmds.test',
      phone: '01700000004',
      role: 'student'
    });

    const course = await Course.findOneAndUpdate(
      { title: 'Light Vehicle Training' },
      {
        title: 'Light Vehicle Training',
        description: 'QA-supported official light vehicle training course for private car, jeep, and microbus learners.',
        duration: '6 weeks',
        price: 10000,
        category: 'Light Vehicle',
        vehicleTypes: ['Private Car', 'Jeep', 'Microbus'],
        capacity: 40,
        isActive: true,
        createdBy: admin._id
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );

    const startDate = addDays(new Date(), 7);
    const endDate = addDays(startDate, 42);

    const batch = await Batch.findOneAndUpdate(
      { batchNumber: 'QA Light Vehicle Batch' },
      {
        name: 'QA Light Vehicle Batch',
        batchNumber: 'QA Light Vehicle Batch',
        batchNo: 'QA-1',
        course: course._id,
        courseType: 'Light Vehicle',
        vehicleTypes: ['Private Car', 'Jeep', 'Microbus'],
        startDate,
        endDate,
        capacity: 40,
        fee: 10000,
        status: 'upcoming',
        isPublished: true,
        assignedInstructors: [instructor._id],
        instructors: [instructor._id],
        notes: 'QA flow test batch. Safe to identify by QA prefix.',
        createdBy: admin._id
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );

    console.log('QA flow data ready');
    console.log(JSON.stringify({
      accounts: {
        admin: 'qa.admin@jmds.test',
        instructor: 'qa.instructor@jmds.test',
        students: ['qa.student1@jmds.test', 'qa.student2@jmds.test'],
        password: QA_PASSWORD
      },
      course: course.title,
      batch: {
        name: batch.name,
        batchNo: batch.batchNo,
        startDate: batch.startDate,
        endDate: batch.endDate,
        capacity: batch.capacity,
        instructor: 'qa.instructor@jmds.test'
      }
    }, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Error seeding QA flow data:', error);
    process.exit(1);
  }
};

seed();
