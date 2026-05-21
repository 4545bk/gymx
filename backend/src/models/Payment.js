/**
 * Payment Model — Immutable financial ledger.
 * NEVER update or hard-delete. Cancellations are reversal documents.
 *
 * Key indexes:
 *   { memberRef: 1, recordedAt: -1 }                            — member payment history
 *   { 'period.year': 1, 'period.month': 1, direction: 1 }      — monthly P&L
 *   { direction: 1, expenseCategory: 1, recordedAt: -1 }       — expense breakdown
 */
const mongoose = require('mongoose');

const periodSchema = new mongoose.Schema({
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true },
}, { _id: false });

const paymentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['membership', 'expense', 'salary', 'other'],
    required: true,
  },

  direction: {
    type: String,
    enum: ['in', 'out'],
    required: true,
  },

  // Income fields (direction: 'in')
  memberRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    default: null,
  },
  memberName: { type: String, default: null },   // Snapshot — member could be deleted later
  planType: { type: String, default: null },      // Snapshot of plan at payment time

  // Expense fields (direction: 'out')
  expenseCategory: {
    type: String,
    enum: ['salary', 'equipment', 'utilities', 'other', null],
    default: null,
  },
  staffRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    default: null,
  },

  description: { type: String, required: true, trim: true },

  // Amount in smallest currency unit (cents). 800 ETB = 80000
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'ETB' },

  paymentMethod: {
    type: String,
    enum: ['cash', 'bank-transfer', 'other'],
    required: true,
  },

  // Period for P&L grouping
  period: { type: periodSchema, required: true },

  // Voiding / reversal
  voided: { type: Boolean, default: false },
  reversalOf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    default: null,
  },

  // Who recorded this
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true,
  },
  recordedAt: { type: Date, required: true, default: Date.now },

  // Multi-branch support (optional)
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    default: null,
  },
}, {
  timestamps: false, // We use recordedAt instead
});

// ─── Indexes ─────────────────────────────────────────────────
paymentSchema.index({ memberRef: 1, recordedAt: -1 });
paymentSchema.index({ 'period.year': 1, 'period.month': 1, direction: 1 });
paymentSchema.index({ direction: 1, expenseCategory: 1, recordedAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
