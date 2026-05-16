/**
 * Attendance Model — Append-only audit trail.
 * One document per check-in event (granted OR denied).
 * NEVER update or delete documents in this collection.
 *
 * Key indexes:
 *   { memberId: 1, date: 1 } — UNIQUE compound, dual-purpose:
 *     (1) duplicate check is an index scan
 *     (2) enforces uniqueness at DB level (error 11000 = duplicate scan)
 *   { memberId: 1, checkedInAt: -1 } — member history view
 *   { date: 1, checkedInAt: -1 }     — daily log view
 *   { status: 1, date: 1 }           — denied entry analytics
 */
const mongoose = require('mongoose');

const planSnapshotSchema = new mongoose.Schema({
  type: { type: String, enum: ['3-day', 'full-week'] },
  expiryDate: { type: Date },
}, { _id: false });

const attendanceSchema = new mongoose.Schema({
  // QR token string (matches members.memberId)
  memberId: { type: String, required: true },

  // ObjectId reference for aggregation joins in reports
  memberRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true,
  },

  // Full UTC timestamp of the scan event
  checkedInAt: { type: Date, required: true, default: Date.now },

  // Local date string YYYY-MM-DD (UTC+3) — CRITICAL for duplicate check
  // Stored as string to avoid timezone comparison bugs
  date: { type: String, required: true },

  // Outcome
  status: {
    type: String,
    enum: ['granted', 'denied'],
    required: true,
  },

  // Deny reason (null when granted)
  denyReason: {
    type: String,
    enum: ['expired', 'suspended', 'frozen', 'wrong-day', 'duplicate', 'unknown-id', null],
    default: null,
  },

  // Snapshot of member's plan at time of scan (audit trail)
  planSnapshot: { type: planSnapshotSchema, default: null },
}, {
  timestamps: false, // We use checkedInAt instead
});

// ─── Indexes (exactly as specified) ──────────────────────────

// CRITICAL: Compound unique index for duplicate prevention
// Handles the optimistic insert pattern — error code 11000 = duplicate
attendanceSchema.index({ memberId: 1, date: 1 }, { unique: true });

// Member attendance history (newest first)
attendanceSchema.index({ memberId: 1, checkedInAt: -1 });

// Daily log view — all check-ins on a given date
attendanceSchema.index({ date: 1, checkedInAt: -1 });

// Denied entry analytics
attendanceSchema.index({ status: 1, date: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
