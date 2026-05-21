/**
 * Migration: Backfill source field on existing Attendance documents.
 * Sets source: 'live' on all documents that don't have a source field.
 *
 * Usage: node src/scripts/migrateAttendanceSource.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { MONGODB_URI } = require('../config/env');
const Attendance = require('../models/Attendance');

async function migrate() {
  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);

  console.log('🔄 Backfilling source field on existing attendance records...');
  const result = await Attendance.updateMany(
    { source: { $exists: false } },
    { $set: { source: 'live' } }
  );

  console.log(`✅ Migration complete: ${result.modifiedCount} records updated with source: 'live'`);

  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
