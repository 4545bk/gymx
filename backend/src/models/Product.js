/**
 * Product Model — Gym product/merchandise catalog.
 * 
 * Indexes:
 *   1. { sku: 1 }           unique — fast lookup by product code
 *   2. { category: 1, status: 1 }  — filter by category in dashboard
 *   3. { name: "text" }     — receptionist search
 *   4. { status: 1, stock: 1 }     — low stock alerts
 */
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: 30,
  },
  category: {
    type: String,
    required: true,
    enum: ['supplements', 'drinks', 'accessories', 'apparel', 'equipment', 'other'],
    default: 'other',
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
    default: '',
  },
  sellingPrice: {
    type: Number,       // In cents (ETB smallest unit): 150 ETB = 15000
    required: true,
    min: 0,
  },
  costPrice: {
    type: Number,       // Purchase cost for profit calculation
    default: 0,
    min: 0,
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  minStockThreshold: {
    type: Number,
    default: 5,
    min: 0,
  },
  imageUrl: {
    type: String,
    default: null,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
  },
}, {
  timestamps: true,
});

// ─── Indexes ─────────────────────────────────────────────
// sku already has `unique: true` in the field definition
productSchema.index({ category: 1, status: 1 });
productSchema.index({ name: 'text' });
productSchema.index({ status: 1, stock: 1 });

// Virtual: is stock below threshold?
productSchema.virtual('isLowStock').get(function () {
  return this.stock <= this.minStockThreshold;
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
