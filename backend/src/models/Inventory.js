/**
 * Inventory Model — Equipment tracking with maintenance scheduling.
 *
 * Key indexes:
 *   { 'maintenance.nextServiceDate': 1, condition: 1 } — maintenance-alert background job
 *   { category: 1, condition: 1 }                      — dashboard filter
 */
const mongoose = require('mongoose');

const purchaseInfoSchema = new mongoose.Schema({
  date: { type: Date, default: null },
  cost: { type: Number, default: 0 },       // In smallest currency unit (cents)
  currency: { type: String, default: 'ETB' },
  vendor: { type: String, default: null },
}, { _id: false });

const maintenanceSchema = new mongoose.Schema({
  lastServiceDate: { type: Date, default: null },
  nextServiceDate: { type: Date, default: null },
  intervalMonths: { type: Number, default: 6, min: 1 },
  notes: { type: String, default: null },
}, { _id: false });

const inventorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: ['Cardio', 'Strength', 'Free weights', 'Accessories', 'Other'],
    required: true,
  },
  brand: { type: String, default: null, trim: true },
  serialNumber: { type: String, default: null, trim: true },
  quantity: { type: Number, required: true, min: 0, default: 1 },

  condition: {
    type: String,
    enum: ['good', 'fair', 'needs-repair', 'retired'],
    default: 'good',
  },

  purchaseInfo: { type: purchaseInfoSchema, default: () => ({}) },
  maintenance: { type: maintenanceSchema, default: () => ({}) },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true,
  },
}, {
  timestamps: true,
});

// ─── Indexes ─────────────────────────────────────────────────
inventorySchema.index({ 'maintenance.nextServiceDate': 1, condition: 1 });
inventorySchema.index({ category: 1, condition: 1 });

module.exports = mongoose.model('Inventory', inventorySchema);
