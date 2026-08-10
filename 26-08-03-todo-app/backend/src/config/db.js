const mongoose = require('mongoose');
const { MONGO_URI } = require('./constants');

/**
 * Opens the Mongoose connection to MongoDB. Call once at startup, before
 * the HTTP server starts accepting traffic - controllers/services assume
 * the connection is already open.
 */
async function connectDB() {
  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(MONGO_URI);
    console.log(`MongoDB connected -> ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  }

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err.message);
  });
}

module.exports = connectDB;
