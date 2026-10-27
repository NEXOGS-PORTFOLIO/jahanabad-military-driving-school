const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Enrollment = require('../models/Enrollment');

dotenv.config();

const migrate = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');

    const collection = Enrollment.collection;
    const indexes = await collection.indexes();

    for (const index of indexes) {
      const isLegacyStudentCourseIndex =
        index.unique &&
        index.key &&
        index.key.student === 1 &&
        index.key.course === 1 &&
        !index.partialFilterExpression;

      if (isLegacyStudentCourseIndex) {
        await collection.dropIndex(index.name);
        console.log(`Dropped legacy enrollment index: ${index.name}`);
      }
    }

    await Enrollment.syncIndexes();
    console.log('Enrollment indexes synchronized successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error migrating enrollment indexes:', error);
    process.exit(1);
  }
};

migrate();
