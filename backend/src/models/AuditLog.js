/**
 * AuditLog Model — Immutable business event log.
 * 
 * Design: Insert-only collection. Never update or delete.
 * Captures who did what, when, and the before/after state.
 * 
 * Indexes:
 *   1. { entity: 1, entityRef: 1, createdAt: -1 }  — entity history
 *   2. { performedBy: 1, createdAt: -1 }            — staff activity
 *   3. { action: 1, createdAt: -1 }                 — action type filter
 */
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      // Product actions
      'PRODUCT_CREATED',
      'PRODUCT_UPDATED',
      'PRODUCT_ARCHIVED',
      'PRODUCT_REACTIVATED',
      'PRODUCT_DELETED',
      // Stock actions
      'STOCK_RESTOCKED',
      'STOCK_ADJUSTED',
      'STOCK_DAMAGED',
      // Sale actions
      'SALE_COMPLETED',
      'SALE_VOIDED',
      // Settings actions
      'SETTINGS_UPDATED',
      // Plan actions
      'PLAN_CREATED',
      'PLAN_UPDATED',
      'PLAN_DELETED',
      // Backup/Restore actions
      'BACKUP_CREATED',
      'RESTORE_STARTED',
      'RESTORE_COMPLETED',
      // Card actions
      'CARD_PRINTED',
    ],
  },
  entity: {
    type: String,
    required: true,
    enum: ['product', 'sale', 'settings', 'plan', 'backup', 'member'],
  },
  entityRef: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  entityName: {
    type: String,
    default: '',
  },
  changes: {
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  metadata: {                // Extra context (quantities, amounts, etc.)
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true,
  },
  performedByName: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

// ─── Indexes ─────────────────────────────────────────────
auditLogSchema.index({ entity: 1, entityRef: 1, createdAt: -1 });
auditLogSchema.index({ performedBy: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
