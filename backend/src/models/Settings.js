/**
 * Settings Model — Singleton document for gym business configuration.
 * 
 * Design: Only ONE document ever exists (upserted by gymId: 'default').
 * All reads/writes target this single document.
 */
const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  gymId: {
    type: String,
    default: 'default',
    unique: true,
  },

  // ─── Gym Identity ──────────────────────────────────────
  gymName: {
    type: String,
    default: 'GymX',
    maxlength: 120,
  },
  tagline: {
    type: String,
    default: 'Gym Management System',
    maxlength: 200,
  },
  logoUrl: {
    type: String,
    default: null,
  },
  phone: {
    type: String,
    default: '',
    maxlength: 30,
  },
  email: {
    type: String,
    default: '',
    maxlength: 120,
  },
  address: {
    type: String,
    default: '',
    maxlength: 300,
  },

  // ─── Regional ──────────────────────────────────────────
  currency: {
    type: String,
    default: 'ETB',
    maxlength: 10,
  },
  timezone: {
    type: String,
    default: 'Africa/Addis_Ababa',
  },

  // ─── Receipt & Card Branding ───────────────────────────
  receiptFooter: {
    type: String,
    default: 'Thank you for choosing GymX!',
    maxlength: 300,
  },
  receiptShowQR: {
    type: Boolean,
    default: true,
  },
  cardShowLogo: {
    type: Boolean,
    default: true,
  },

  // ─── Defaults ──────────────────────────────────────────
  defaultLowStockThreshold: {
    type: Number,
    default: 5,
    min: 0,
  },
  dashboardRefreshSeconds: {
    type: Number,
    default: 30,
    min: 5,
    max: 300,
  },

  // ─── Backup metadata ──────────────────────────────────
  lastBackupAt: {
    type: Date,
    default: null,
  },
  lastBackupBy: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

// gymId already has `unique: true` in the field definition

module.exports = mongoose.model('Settings', settingsSchema);
