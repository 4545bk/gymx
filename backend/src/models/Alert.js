/**
 * Alert Model — Internal notification queue.
 * Auto-expires via TTL index on expiresAt.
 * Visible only to owner and receptionist roles.
 *
 * Key indexes:
 *   { expiresAt: 1 }                               — TTL index (expireAfterSeconds: 0)
 *   { visibleTo: 1, isRead: 1, createdAt: -1 }     — alert feed query
 */
const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'membership-expiring',
      'membership-expired',
      'payment-overdue',
      'maintenance-due',
      'manual',
    ],
    required: true,
  },

  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    required: true,
  },

  // Subject entity (polymorphic reference)
  subjectType: {
    type: String,
    enum: ['member', 'equipment', 'staff'],
    required: true,
  },
  subjectRef: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  subjectName: { type: String, required: true }, // Snapshot for fast rendering

  message: { type: String, required: true },

  // Role visibility
  visibleTo: {
    type: [String],
    enum: ['owner', 'receptionist'],
    required: true,
  },

  // Read state
  isRead: { type: Boolean, default: false },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
  }],

  createdAt: { type: Date, default: Date.now },

  // TTL field — MongoDB auto-deletes when this date passes
  expiresAt: { type: Date, required: true },
}, {
  timestamps: false, // We manage createdAt manually
});

// ─── Indexes ─────────────────────────────────────────────────
// TTL index — MongoDB background thread deletes expired documents automatically
alertSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Alert feed query: unread alerts for a role, newest first
alertSchema.index({ visibleTo: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);
