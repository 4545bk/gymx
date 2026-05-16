/**
 * InventoryMovement Model — Complete audit trail of all stock changes.
 * 
 * Every stock change creates an immutable movement record.
 * Never update or delete these — insert only.
 * 
 * Indexes:
 *   1. { productRef: 1, createdAt: -1 }  — product stock history
 *   2. { type: 1, createdAt: -1 }        — filter by movement type
 */
const mongoose = require('mongoose');

const inventoryMovementSchema = new mongoose.Schema({
  productRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  productName: {            // Snapshot
    type: String,
    required: true,
  },
  sku: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: [
      'initial',            // Product created with initial stock
      'restock',            // Stock added (purchase/delivery)
      'sale',               // Stock reduced by sale
      'correction',         // Manual stock adjustment
      'return',             // Stock returned from voided sale
      'damaged',            // Stock written off (damage/loss)
      'archived',           // Product archived
    ],
  },
  quantityChange: {         // Positive = added, Negative = removed
    type: Number,
    required: true,
  },
  stockBefore: {
    type: Number,
    required: true,
  },
  stockAfter: {
    type: Number,
    required: true,
  },
  reason: {
    type: String,
    trim: true,
    maxlength: 300,
    default: '',
  },
  saleRef: {                // Reference to sale (for type: 'sale' or 'return')
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale',
    default: null,
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true,
  },
  performedByName: {        // Snapshot
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

// ─── Indexes ─────────────────────────────────────────────
inventoryMovementSchema.index({ productRef: 1, createdAt: -1 });
inventoryMovementSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('InventoryMovement', inventoryMovementSchema);
