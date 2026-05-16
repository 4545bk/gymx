/**
 * Seed Script — Creates the initial owner account.
 * Run: npm run seed
 * 
 * Uses environment variables:
 *   SEED_OWNER_EMAIL    (default: owner@gymx.com)
 *   SEED_OWNER_PASSWORD (default: OwnerPass123!)
 *   SEED_OWNER_NAME     (default: Gym Owner)
 */
require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { MONGODB_URI } = require('../config/env');
const Staff = require('../models/Staff');

const SALT_ROUNDS = 12;

const seed = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const email = (process.env.SEED_OWNER_EMAIL || 'owner@gymx.com').toLowerCase();
    const password = process.env.SEED_OWNER_PASSWORD || 'OwnerPass123!';
    const fullName = process.env.SEED_OWNER_NAME || 'Gym Owner';

    // Check if owner already exists
    const existing = await Staff.findOne({ email });
    if (existing) {
      console.log(`⚠️  Owner account already exists: ${email}`);
      console.log(`   Role: ${existing.role}`);
      console.log(`   Status: ${existing.status}`);
      process.exit(0);
    }

    // Create owner
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const owner = await Staff.create({
      fullName,
      email,
      phone: null,
      role: 'owner',
      passwordHash,
      status: 'active',
      salary: { amount: 0, currency: 'ETB', paymentDay: 30 },
    });

    console.log('──────────────────────────────────────────────────');
    console.log('✅ Owner account created successfully');
    console.log(`   Name:     ${owner.fullName}`);
    console.log(`   Email:    ${owner.email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role:     ${owner.role}`);
    console.log('──────────────────────────────────────────────────');
    console.log('⚠️  CHANGE THE DEFAULT PASSWORD after first login!');
    console.log('──────────────────────────────────────────────────');

    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
};

seed();
