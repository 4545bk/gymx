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
    default: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiB2aWV3Qm94PSIwIDAgMTI4IDEyOCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJiZyIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6IzdjM2FlZCIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3R5bGU9InN0b3AtY29sb3I6IzRjMWQ5NSIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiByeD0iMjQiIGZpbGw9InVybCgjYmcpIi8+PHRleHQgeD0iNjQiIHk9Ijc4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwsc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjkwMCIgZm9udC1zaXplPSI1NiIgZmlsbD0id2hpdGUiIGxldHRlci1zcGFjaW5nPSItMiI+R1g8L3RleHQ+PC9zdmc+",
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
