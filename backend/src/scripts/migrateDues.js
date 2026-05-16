/**
 * Migration: Backfill paymentStatus and billing for existing members.
 *
 * Run once: node src/scripts/migrateDues.js
 *
 * Logic:
 *   - Members with no billing data → set paymentStatus: 'paid', billing zeroed
 *   - Already-set members are skipped
 */
require('dotenv').config();
require('../config/env');
const connectDB = require('../config/db');
const Member = require('../models/Member');

async function migrate() {
  await connectDB();
  console.log('🔄 Starting dues migration...');

  const members = await Member.find({
    $or: [
      { paymentStatus: { $exists: false } },
      { 'billing.totalDue': { $exists: false } },
    ],
  });

  console.log(`   Found ${members.length} members to migrate`);

  let updated = 0;
  for (const m of members) {
    if (!m.paymentStatus) m.paymentStatus = 'paid';
    if (!m.billing || m.billing.totalDue === undefined) {
      m.billing = {
        totalDue: 0,
        amountPaid: 0,
        remainingBalance: 0,
        lastPaymentDate: null,
        lastPaymentAmount: 0,
        paymentCount: 0,
      };
    }
    if (!m.card) {
      m.card = { issuedAt: null, printCount: 0, lastPrintedBy: null };
    }
    await m.save();
    updated++;
  }

  console.log(`✅ Migration complete. Updated ${updated} members.`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
