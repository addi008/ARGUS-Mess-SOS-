/**
 * config/db.js
 * Connects to MongoDB using Mongoose.
 * URI is read from the MONGODB_URI environment variable.
 */

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // useNewUrlParser and useUnifiedTopology are defaults in Mongoose 8+
    });
    console.log(`✅  MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌  MongoDB connection error: ${error.message}`);
    process.exit(1); // Exit process if DB fails to connect
  }
};

module.exports = connectDB;
