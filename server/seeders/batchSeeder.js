const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Course = require('../models/Course');
const Batch = require('../models/Batch');
const User = require('../models/User');

dotenv.config();

const officialCourses = [
  {
    title: 'Light Vehicle Training',
    description: 'Structured training for private car, jeep, and microbus learners focused on safe and confident light vehicle driving.',
    duration: '6 weeks',
    price: 10000,
    category: 'Light Vehicle',
    vehicleTypes: ['Private Car', 'Jeep', 'Microbus'],
    capacity: 40
  },
  {
    title: 'Medium Vehicle Training',
    description: 'Professional training for truck and bus operation with focus on safety, discipline, and practical driving skill.',
    duration: '4 weeks',
    price: 13000,
    category: 'Medium Vehicle',
    vehicleTypes: ['Truck', 'Bus'],
    capacity: 30
  },
  {
    title: 'Heavy Vehicle Training',
    description: 'Advanced training for container carrier, fuel bowser, dumper, and bus driving for transport-sector readiness.',
    duration: '4 weeks',
    price: 15000,
    category: 'Heavy Vehicle',
    vehicleTypes: ['Container Carrier', 'Fuel Bowser', 'Dumper', 'Bus'],
    capacity: 30
  },
  {
    title: 'Master Instructor Certification Training Program',
    description: 'Special instructor certification training program recorded in the official conducted course history.',
    duration: '3 weeks',
    price: 0,
    category: 'Instructor Certification',
    vehicleTypes: [],
    capacity: 19
  }
];

const officialBatches = [
  { batchNo: 1, name: 'Driving Training Course-1', courseTitle: 'Light Vehicle Training', courseType: 'Light Vehicle', startDate: '2025-05-25', endDate: '2025-07-10', capacity: 40, completedCount: 24, vehicleTypes: ['Private Car', 'Jeep', 'Microbus'], fee: 10000, status: 'completed' },
  { batchNo: 2, name: 'Driving Training Course-2', courseTitle: 'Light Vehicle Training', courseType: 'Light Vehicle', startDate: '2025-07-27', endDate: '2025-09-04', capacity: 40, completedCount: 36, vehicleTypes: ['Private Car', 'Jeep', 'Microbus'], fee: 10000, status: 'completed' },
  { batchNo: 3, name: 'Driving Training Course-3', courseTitle: 'Light Vehicle Training', courseType: 'Light Vehicle', startDate: '2025-09-14', endDate: '2025-10-23', capacity: 40, completedCount: 40, vehicleTypes: ['Private Car', 'Jeep', 'Microbus'], fee: 10000, status: 'completed' },
  { batchNo: 4, name: 'Driving Training Course-4', courseTitle: 'Light Vehicle Training', courseType: 'Light Vehicle', startDate: '2025-11-02', endDate: '2025-12-11', capacity: 40, completedCount: 39, vehicleTypes: ['Private Car', 'Jeep', 'Microbus'], fee: 10000, status: 'completed' },
  { batchNo: 5, name: 'Master Instructor Certification Training Program-2025', courseTitle: 'Master Instructor Certification Training Program', courseType: 'Master Instructor', startDate: '2025-11-30', endDate: '2025-12-21', capacity: 19, completedCount: 19, vehicleTypes: [], fee: 0, status: 'completed' },
  { batchNo: 6, name: 'Driving Training Course-5', courseTitle: 'Light Vehicle Training', courseType: 'Light Vehicle', startDate: '2025-12-28', endDate: '2026-02-05', capacity: 40, completedCount: 40, vehicleTypes: ['Private Car', 'Jeep', 'Microbus'], fee: 10000, status: 'completed' },
  { batchNo: 7, name: 'Driving Training Course-6', courseTitle: 'Light Vehicle Training', courseType: 'Light Vehicle', startDate: '2026-03-01', endDate: '2026-04-16', capacity: 40, completedCount: 40, vehicleTypes: ['Private Car', 'Jeep', 'Microbus'], fee: 10000, status: 'completed' }
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');

    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.log('Please run seedAdmin.js first to create an admin user');
      process.exit(1);
    }

    const courseMap = {};
    for (const item of officialCourses) {
      const course = await Course.findOneAndUpdate(
        { title: item.title },
        {
          title: item.title,
          description: item.description,
          duration: item.duration,
          price: item.price,
          category: item.category,
          vehicleTypes: item.vehicleTypes,
          capacity: item.capacity,
          isActive: true,
          createdBy: admin._id
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      courseMap[item.title] = course;
    }

    let created = 0;
    let updated = 0;
    for (const item of officialBatches) {
      const course = courseMap[item.courseTitle];
      const existing = await Batch.findOne({
        batchNo: item.batchNo,
        startDate: new Date(item.startDate)
      });

      const payload = {
        name: item.name,
        batchNumber: item.name,
        batchNo: item.batchNo,
        course: course._id,
        courseType: item.courseType,
        vehicleTypes: item.vehicleTypes,
        startDate: item.startDate,
        endDate: item.endDate,
        capacity: item.capacity,
        fee: item.fee,
        status: item.status,
        isPublished: true,
        enrolledCount: item.completedCount,
        completedCount: item.completedCount,
        officialStudentCount: item.completedCount,
        officialCompletedCount: item.completedCount,
        notes: `Official conducted batch record. Students: ${item.completedCount}`,
        createdBy: admin._id
      };

      if (existing) {
        await Batch.findByIdAndUpdate(existing._id, payload, { runValidators: true });
        updated += 1;
      } else {
        await Batch.create(payload);
        created += 1;
      }
    }

    console.log(`Official course and batch seeding completed. Batches created: ${created}, updated: ${updated}`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding official batches:', error);
    process.exit(1);
  }
};

seed();
