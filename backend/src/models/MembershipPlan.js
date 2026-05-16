/**
 * MembershipPlan Model — Configurable membership plans.
 * 
 * Replaces hardcoded plan types. Future member registrations
 * should reference these plans dynamically.
 */
const mongoose = require('mongoose');

const membershipPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    maxlength: 80,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 40,
  },
  description: {
    type: String,
    default: '',
    maxlength: 300,
  },
  type: {
    type: String,
    required: true,
    enum: ['full-week', '3-day', 'weekend', 'custom'],
    default: 'full-week',
  },
  durationMonths: {
    type: Number,
    required: true,
    default: 1,
    min: 1,
    max: 24,
  },
  allowedDays: {
    type: [Number],        // ISO weekdays: 1=Mon…7=Sun. null/empty for full-week
    default: null,
  },
  price: {
    type: Number,           // Cents (ETB)
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  sortOrder: {
    type: Number,
    default: 0,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
  },
}, {
  timestamps: true,
});

// slug already has `unique: true` in the field definition
membershipPlanSchema.index({ status: 1, sortOrder: 1 });

module.exports = mongoose.model('MembershipPlan', membershipPlanSchema);
