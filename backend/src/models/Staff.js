/**
 * Staff Model — Covers owners, receptionists, and trainers.
 * passwordHash and refreshTokenHash are select: false (never returned in API responses).
 *
 * Key indexes:
 *   { email: 1 }          — unique, login lookup
 *   { role: 1, status: 1 } — "list all active trainers" query
 */
const mongoose = require('mongoose');

const trainerProfileSchema = new mongoose.Schema({
  specialization: { type: String, default: null },
  schedule: {
    mon: { type: Boolean, default: false },
    tue: { type: Boolean, default: false },
    wed: { type: Boolean, default: false },
    thu: { type: Boolean, default: false },
    fri: { type: Boolean, default: false },
    sat: { type: Boolean, default: false },
    sun: { type: Boolean, default: false },
  },
  assignedMemberCount: { type: Number, default: 0 },
}, { _id: false });

const salarySchema = new mongoose.Schema({
  amount: { type: Number, default: 0 },   // In smallest currency unit (cents)
  currency: { type: String, default: 'ETB' },
  paymentDay: { type: Number, default: 30, min: 1, max: 31 },
}, { _id: false });

const staffSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  phone: { type: String, default: null, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true, // Normalized on write
    trim: true,
  },

  role: {
    type: String,
    enum: ['owner', 'receptionist', 'trainer'],
    required: true,
  },

  // Auth — NEVER returned in API responses
  passwordHash: { type: String, required: true, select: false },
  refreshTokenHash: { type: String, default: null, select: false },
  lastLoginAt: { type: Date, default: null },

  // Trainer-specific (null for owner/receptionist)
  trainerProfile: { type: trainerProfileSchema, default: null },

  // Salary terms (embedded — actual payments in payments collection)
  salary: { type: salarySchema, default: () => ({}) },

  // Status
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },

  // Multi-branch support — branches this staff member can access
  // Empty array = all branches (owner default). Populated = scoped access.
  assignedBranches: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
  }],
}, {
  timestamps: true,
});

// ─── Indexes ─────────────────────────────────────────────────
// Email unique index is set via unique: true above
staffSchema.index({ role: 1, status: 1 });

module.exports = mongoose.model('Staff', staffSchema);
