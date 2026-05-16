/**
 * Member Model — The HOT collection.
 * Read on every QR scan. Optimized for check-in lookup speed.
 *
 * Key indexes:
 *   { memberId: 1 }                     — unique, PRIMARY hot-path index
 *   { phone: 1 }                        — unique, duplicate registration check
 *   { fullName: 'text' }                — text search for receptionist
 *   { 'plan.expiryDate': 1, status: 1 } — expiry alert background job
 *   { assignedTrainerId: 1, status: 1 } — trainer dashboard query
 */
const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['3-day', 'full-week', 'weekend', 'custom'],
    required: true,
  },
  allowedDays: {
    type: [Number], // ISO weekday integers [1=Mon … 7=Sun]
    default: null,
    validate: {
      validator: function (v) {
        if (this.type === '3-day') {
          return Array.isArray(v) && v.length === 3 &&
            v.every((d) => d >= 1 && d <= 7);
        }
        return v === null || v === undefined || v.length === 0;
      },
      message: '3-day plan requires exactly 3 allowed days (1-7)',
    },
  },
  startDate: { type: Date, required: true },
  expiryDate: { type: Date, required: true },
  durationMonths: { type: Number, required: true, min: 1 },
}, { _id: false });

const paymentSummarySchema = new mongoose.Schema({
  lastPaidDate: { type: Date, default: null },
  lastPaidAmount: { type: Number, default: 0 }, // In smallest currency unit (cents)
  outstandingBalance: { type: Number, default: 0 },
}, { _id: false });

const billingSchema = new mongoose.Schema({
  totalDue: { type: Number, default: 0, min: 0 },         // Total membership fee in cents
  amountPaid: { type: Number, default: 0, min: 0 },       // Sum of all payments toward this period
  remainingBalance: { type: Number, default: 0, min: 0 },  // totalDue - amountPaid
  lastPaymentDate: { type: Date, default: null },
  lastPaymentAmount: { type: Number, default: 0 },
  paymentCount: { type: Number, default: 0 },              // Number of partial payments
}, { _id: false });

const emergencyContactSchema = new mongoose.Schema({
  name: { type: String, default: null },
  phone: { type: String, default: null },
}, { _id: false });

const memberSchema = new mongoose.Schema({
  // QR identity — this is what the scanner sends
  memberId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    match: /^MBR-[A-Z0-9]{8}$/,
  },

  // Personal info
  fullName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  photoUrl: { type: String, default: null },
  emergencyContact: { type: emergencyContactSchema, default: () => ({}) },

  // QR code data
  qrCodeBase64: { type: String, default: null, select: false }, // Large, excluded from default queries

  // Membership plan (embedded — always read together)
  plan: { type: planSchema, required: true },

  // Status
  status: {
    type: String,
    enum: ['active', 'expired', 'suspended', 'frozen'],
    default: 'active',
    index: true,
  },

  // Financial payment status (independent from membership access status)
  paymentStatus: {
    type: String,
    enum: ['paid', 'partial', 'unpaid', 'overdue'],
    default: 'unpaid',
  },

  // Billing for current membership period
  billing: { type: billingSchema, default: () => ({}) },

  // Payment summary (embedded denormalized — avoids joins on dashboard)
  paymentSummary: { type: paymentSummarySchema, default: () => ({}) },

  // Assigned trainer
  assignedTrainerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    default: null,
  },

  // Card issuance tracking (permanent ID card — printed once)
  card: {
    issuedAt: { type: Date, default: null },          // Set ONCE on first print, never overwritten
    printCount: { type: Number, default: 0 },         // Increments on every print
    lastPrintedBy: {                                   // Staff who printed most recently
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null,
    },
  },

  // Registered by (receptionist)
  registeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true,
  },
}, {
  timestamps: true, // createdAt, updatedAt
});

// ─── Indexes (exactly as specified in documentation) ─────────
// Primary hot-path index (already set via unique: true on memberId)
// Phone uniqueness (already set via unique: true on phone)

// Text index for name search
memberSchema.index({ fullName: 'text' });

// Expiry alerts — find members expiring soon
memberSchema.index({ 'plan.expiryDate': 1, status: 1 });

// Trainer dashboard — list their assigned members
memberSchema.index({ assignedTrainerId: 1, status: 1 });

// Payment status — dues tracking queries
memberSchema.index({ paymentStatus: 1, status: 1 });

module.exports = mongoose.model('Member', memberSchema);
