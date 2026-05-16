/**
 * MongoDB connection using Mongoose.
 * minPoolSize: 5 ensures warm connections at startup (no cold-start penalty on first QR scan).
 */
const mongoose = require('mongoose');
const { MONGODB_URI } = require('./env');

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      minPoolSize: 5,
      maxPoolSize: 10,
    });
    console.log(`✅ MongoDB connected: ${mongoose.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB runtime error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB disconnected. Attempting reconnection...');
  });
};

module.exports = connectDB;
