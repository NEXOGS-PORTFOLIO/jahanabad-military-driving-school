const mongoose = require('mongoose');
const { databaseUri, databaseError, connectionOptions } = require('./database');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(databaseUri(), connectionOptions);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    const diagnostic = databaseError(error);
    console.error(`MongoDB: ${diagnostic.code}. ${diagnostic.hint}`);
    if (diagnostic.code.startsWith('DB_CONFIG_')) return;
    // Don't exit - let the app start and show the error
    setTimeout(connectDB, 5000); // Retry after 5 seconds
  }
};

module.exports = connectDB;
