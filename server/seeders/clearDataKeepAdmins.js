const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const PRESERVED_USER_FILTER = { role: 'admin' };

const clearDataKeepAdmins = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`MongoDB Connected: ${mongoose.connection.host}`);

  const collections = await mongoose.connection.db.collections();
  const summary = [];

  for (const collection of collections) {
    if (collection.collectionName.startsWith('system.')) {
      continue;
    }

    if (collection.collectionName === 'users') {
      const before = await collection.countDocuments();
      const preserved = await collection.countDocuments(PRESERVED_USER_FILTER);
      const result = await collection.deleteMany({ role: { $ne: 'admin' } });
      const after = await collection.countDocuments();

      summary.push({
        collection: collection.collectionName,
        before,
        deleted: result.deletedCount,
        after,
        preservedAdmins: preserved
      });
      continue;
    }

    const before = await collection.countDocuments();
    const result = await collection.deleteMany({});
    const after = await collection.countDocuments();

    summary.push({
      collection: collection.collectionName,
      before,
      deleted: result.deletedCount,
      after
    });
  }

  console.table(summary);
  await mongoose.disconnect();
};

clearDataKeepAdmins()
  .then(() => {
    console.log('Database cleared successfully. Admin users were preserved.');
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('Failed to clear database:', error.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  });
