const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const dropOldIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected...');

    const db = mongoose.connection.db;
    const collection = db.collection('courses');
    
    // Drop the old 'name' index
    try {
      await collection.dropIndex('name_1');
      console.log('Dropped old name_1 index');
    } catch (error) {
      if (error.code === 27) {
        console.log('Index name_1 does not exist, skipping...');
      } else {
        throw error;
      }
    }

    console.log('Done!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

dropOldIndexes();
