/**
 * Sale Model — Records completed sales transactions.
 * 
 * Design: Sale items are EMBEDDED (not referenced) because:
 *   - Always read together with the sale
 *   - Bounded size (a single sale rarely exceeds 20 items)
 *   - Snapshot prices at time of sale (immune to future price changes)
 * 
 * Indexes:
 *   1. { saleDate: -1 }              — chronological listing
 *   2. { soldBy: 1, saleDate: -1 }   — staff sales history
 *   3. { "items.productRef": 1 }     — product sales lookup
 */
const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  productRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  productName: {             // Snapshot — product may be archived later
    type: String,
    required: true,
  },
  sku: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  unitPrice: {               // Price at time of sale (cents)
    type: Number,
    required: true,
    min: 0,
  },
  lineTotal: {               // quantity × unitPrice
    type: Number,
    required: true,
  },
}, { _id: false });

const saleSchema = new mongoose.Schema({
  saleNumber: {
    type: String,
    required: true,
    unique: true,            // Auto-generated: SL-20260507-001
  },
  items: {
    type: [saleItemSchema],
    required: true,
    validate: {
      validator: (v) => v.length > 0,
      message: 'Sale must have at least one item',
    },
  },
  subtotal: {                // Sum of all lineTotal (cents)
    type: Number,
    required: true,
  },
  discount: {                // Discount amount (cents)
    type: Number,
    default: 0,
    min: 0,
  },
  total: {                   // subtotal - discount (cents)
    type: Number,
    required: true,
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank-transfer', 'other'],
    default: 'cash',
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500,
    default: '',
  },
  soldBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true,
  },
  soldByName: {              // Snapshot
    type: String,
    required: true,
  },
  saleDate: {
    type: Date,
    default: Date.now,
  },
  voided: {
    type: Boolean,
    default: false,
  },
  voidedAt: Date,
  voidedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
  },
  voidReason: String,
}, {
  timestamps: true,
});

// ─── Indexes ─────────────────────────────────────────────
saleSchema.index({ saleDate: -1 });
saleSchema.index({ soldBy: 1, saleDate: -1 });
saleSchema.index({ 'items.productRef': 1 });

module.exports = mongoose.model('Sale', saleSchema);
