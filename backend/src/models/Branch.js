/**
 * Branch Model — Multi-location support for GymX.
 *
 * Each gym can have multiple branches (locations).
 * All branchId fields across the system are OPTIONAL to maintain
 * backwards compatibility with single-branch gyms.
 *
 * Key indexes:
 *   { gymId: 1, isActive: 1 }    — list active branches for a gym
 *   { scannerApiKey: 1 }         — scanner authentication lookup
 *
 * Migration note for existing data:
 *   // To backfill existing documents with a default branch:
 *   // 1. Create a default branch: db.branches.insertOne({ name: 'Main Branch', gymId: '<gymId>', isHeadquarters: true, isActive: true })
 *   // 2. Update all existing docs: db.members.updateMany({ branchId: { $exists: false } }, { $set: { branchId: defaultBranchId } })
 *   //    Repeat for: attendance, payments, sales collections
 */
const mongoose = require('mongoose');
const crypto = require('crypto');

const branchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  address: {
    type: String,
    default: null,
    trim: true,
  },
  phone: {
    type: String,
    default: null,
    trim: true,
  },
  gymId: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isHeadquarters: {
    type: Boolean,
    default: false,
  },
  scannerApiKey: {
    type: String,
    unique: true,
    sparse: true,
    default: () => `branch-${crypto.randomBytes(16).toString('hex')}`,
  },
}, {
  timestamps: true,
});

// ─── Indexes ─────────────────────────────────────────────────
branchSchema.index({ gymId: 1, isActive: 1 });

module.exports = mongoose.model('Branch', branchSchema);
