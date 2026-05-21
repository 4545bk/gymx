/**
 * Migration: Scope all existing members, check-ins (attendance), sales, and payments
 * to the default headquarters branch.
 *
 * Run once: node src/scripts/migrateBranches.js
 */
require('dotenv').config();
require('../config/env');
const connectDB = require('../config/db');
const Branch = require('../models/Branch');
const Member = require('../models/Member');
const Attendance = require('../models/Attendance');
const Payment = require('../models/Payment');
const Sale = require('../models/Sale');

async function migrate() {
  await connectDB();
  console.log('🔄 Starting multi-branch scoping migration...');

  // 1. Find or create the default headquarters branch
  let hqBranch = await Branch.findOne({ gymId: 'default', isHeadquarters: true });
  if (!hqBranch) {
    hqBranch = await Branch.create({
      name: 'Headquarters',
      gymId: 'default',
      isHeadquarters: true,
      isActive: true,
      address: 'Main Location',
    });
    console.log('✅ Created default Headquarters branch:', hqBranch._id);
  } else {
    console.log('ℹ️ Default Headquarters branch already exists:', hqBranch.name, `(${hqBranch._id})`);
  }

  const defaultBranchId = hqBranch._id;

  // 2. Migrate Members
  console.log('🔄 Scoping Members without a branchId...');
  const memberResult = await Member.updateMany(
    { $or: [{ branchId: { $exists: false } }, { branchId: null }] },
    { $set: { branchId: defaultBranchId } }
  );
  console.log(`✅ Members updated: matched ${memberResult.matchedCount}, modified ${memberResult.modifiedCount}`);

  // 3. Migrate Attendance (Check-ins)
  console.log('🔄 Scoping Attendance without a branchId...');
  const attendanceResult = await Attendance.updateMany(
    { $or: [{ branchId: { $exists: false } }, { branchId: null }] },
    { $set: { branchId: defaultBranchId } }
  );
  console.log(`✅ Attendance updated: matched ${attendanceResult.matchedCount}, modified ${attendanceResult.modifiedCount}`);

  // 4. Migrate Payments
  console.log('🔄 Scoping Payments without a branchId...');
  const paymentResult = await Payment.updateMany(
    { $or: [{ branchId: { $exists: false } }, { branchId: null }] },
    { $set: { branchId: defaultBranchId } }
  );
  console.log(`✅ Payments updated: matched ${paymentResult.matchedCount}, modified ${paymentResult.modifiedCount}`);

  // 5. Migrate Sales
  console.log('🔄 Scoping Sales without a branchId...');
  const saleResult = await Sale.updateMany(
    { $or: [{ branchId: { $exists: false } }, { branchId: null }] },
    { $set: { branchId: defaultBranchId } }
  );
  console.log(`✅ Sales updated: matched ${saleResult.matchedCount}, modified ${saleResult.modifiedCount}`);

  console.log('🎉 Multi-branch scoping migration complete!');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
