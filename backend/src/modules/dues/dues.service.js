/**
 * Dues Service — Membership payment tracking and due management.
 *
 * Key design:
 *   - paymentStatus is INDEPENDENT from membership access status
 *   - billing tracks totalDue/amountPaid/remainingBalance per period
 *   - Partial payments are fully supported
 *   - Each payment creates an immutable Payment record + updates billing
 *   - Overdue detection runs as background check
 */
const Member = require('../../models/Member');
const Payment = require('../../models/Payment');
const { invalidateCache } = require('../members/members.service');

// ─── Record a dues payment toward a member's billing ─────
const recordDuesPayment = async (data, staffId, staffName) => {
  const { memberId, amount, paymentMethod = 'cash', description = '' } = data;

  const member = await Member.findOne({ memberId });
  if (!member) {
    const err = new Error('Member not found');
    err.statusCode = 404;
    throw err;
  }

  const billing = member.billing || { totalDue: 0, amountPaid: 0, remainingBalance: 0, paymentCount: 0 };

  // Prevent overpayment
  const remaining = billing.totalDue - billing.amountPaid;
  if (amount > remaining && remaining > 0) {
    const err = new Error(`Payment amount (${amount}) exceeds remaining balance (${remaining})`);
    err.statusCode = 400;
    err.code = 'OVERPAYMENT';
    throw err;
  }

  // 1. Create immutable Payment record
  const now = new Date();
  const payment = await Payment.create({
    type: 'membership',
    direction: 'in',
    memberRef: member._id,
    memberName: member.fullName,
    planType: member.plan?.type || null,
    description: description || `Membership payment for ${member.fullName}`,
    amount,
    currency: 'ETB',
    paymentMethod,
    period: { month: now.getMonth() + 1, year: now.getFullYear() },
    recordedBy: staffId,
    recordedAt: now,
  });

  // 2. Update billing
  const newAmountPaid = billing.amountPaid + amount;
  const newRemaining = Math.max(0, billing.totalDue - newAmountPaid);
  let newPaymentStatus;

  if (newRemaining <= 0) {
    newPaymentStatus = 'paid';
  } else if (newAmountPaid > 0) {
    newPaymentStatus = 'partial';
  } else {
    newPaymentStatus = 'unpaid';
  }

  member.billing = {
    totalDue: billing.totalDue,
    amountPaid: newAmountPaid,
    remainingBalance: newRemaining,
    lastPaymentDate: now,
    lastPaymentAmount: amount,
    paymentCount: (billing.paymentCount || 0) + 1,
  };
  member.paymentStatus = newPaymentStatus;

  // Also update legacy paymentSummary for backward compatibility
  member.paymentSummary = {
    lastPaidDate: now,
    lastPaidAmount: amount,
    outstandingBalance: newRemaining,
  };

  await member.save();
  await invalidateCache(memberId);

  return {
    payment,
    billing: member.billing,
    paymentStatus: member.paymentStatus,
  };
};

// ─── Set totalDue for a member (e.g., on plan renewal) ───
const setMemberDues = async (memberId, totalDue, staffId, staffName) => {
  const member = await Member.findOne({ memberId });
  if (!member) {
    const err = new Error('Member not found');
    err.statusCode = 404;
    throw err;
  }

  const before = { totalDue: member.billing?.totalDue || 0, paymentStatus: member.paymentStatus };

  member.billing = {
    totalDue,
    amountPaid: 0,
    remainingBalance: totalDue,
    lastPaymentDate: null,
    lastPaymentAmount: 0,
    paymentCount: 0,
  };
  member.paymentStatus = totalDue > 0 ? 'unpaid' : 'paid';
  member.paymentSummary.outstandingBalance = totalDue;

  await member.save();
  await invalidateCache(memberId);

  return { billing: member.billing, paymentStatus: member.paymentStatus };
};

// ─── Get dues overview (dashboard summary) ───────────────
const getDuesOverview = async () => {
  const [
    totalUnpaid, totalPartial, totalOverdue, totalPaid,
    unpaidRevenue, partialRevenue, overdueRevenue,
  ] = await Promise.all([
    Member.countDocuments({ paymentStatus: 'unpaid', status: { $in: ['active', 'expired'] } }),
    Member.countDocuments({ paymentStatus: 'partial', status: { $in: ['active', 'expired'] } }),
    Member.countDocuments({ paymentStatus: 'overdue', status: { $in: ['active', 'expired'] } }),
    Member.countDocuments({ paymentStatus: 'paid', status: { $in: ['active', 'expired'] } }),
    Member.aggregate([
      { $match: { paymentStatus: 'unpaid', status: { $in: ['active', 'expired'] } } },
      { $group: { _id: null, total: { $sum: '$billing.remainingBalance' } } },
    ]),
    Member.aggregate([
      { $match: { paymentStatus: 'partial', status: { $in: ['active', 'expired'] } } },
      { $group: { _id: null, total: { $sum: '$billing.remainingBalance' } } },
    ]),
    Member.aggregate([
      { $match: { paymentStatus: 'overdue', status: { $in: ['active', 'expired'] } } },
      { $group: { _id: null, total: { $sum: '$billing.remainingBalance' } } },
    ]),
  ]);

  return {
    counts: {
      unpaid: totalUnpaid,
      partial: totalPartial,
      overdue: totalOverdue,
      paid: totalPaid,
    },
    outstandingRevenue: {
      unpaid: unpaidRevenue[0]?.total || 0,
      partial: partialRevenue[0]?.total || 0,
      overdue: overdueRevenue[0]?.total || 0,
      total: (unpaidRevenue[0]?.total || 0) + (partialRevenue[0]?.total || 0) + (overdueRevenue[0]?.total || 0),
    },
  };
};

// ─── List members by payment status ──────────────────────
const listMembersByPaymentStatus = async (query) => {
  const { paymentStatus, page = 1, limit = 20 } = query;
  const filter = {};

  if (paymentStatus) {
    filter.paymentStatus = paymentStatus;
  } else {
    // Default: show all non-paid
    filter.paymentStatus = { $in: ['unpaid', 'partial', 'overdue'] };
  }
  filter.status = { $in: ['active', 'expired'] };

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [members, total] = await Promise.all([
    Member.find(filter)
      .sort({ 'billing.remainingBalance': -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Member.countDocuments(filter),
  ]);

  const data = members.map(m => ({
    memberId: m.memberId,
    fullName: m.fullName,
    phone: m.phone,
    status: m.status,
    paymentStatus: m.paymentStatus,
    plan: { type: m.plan?.type, expiryDate: m.plan?.expiryDate },
    billing: m.billing || {},
  }));

  return {
    data,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
};

// ─── Get payment history for a member ────────────────────
const getMemberPaymentHistory = async (memberId) => {
  const member = await Member.findOne({ memberId }).lean();
  if (!member) {
    const err = new Error('Member not found');
    err.statusCode = 404;
    throw err;
  }

  const payments = await Payment.find({
    memberRef: member._id,
    type: 'membership',
    direction: 'in',
    voided: { $ne: true },
  }).sort({ recordedAt: -1 }).limit(50).populate('recordedBy', 'fullName').lean();

  return {
    member: {
      memberId: member.memberId,
      fullName: member.fullName,
      paymentStatus: member.paymentStatus,
      billing: member.billing || {},
    },
    payments: payments.map(p => ({
      id: p._id,
      amount: p.amount,
      paymentMethod: p.paymentMethod,
      description: p.description,
      recordedBy: p.recordedBy?.fullName || 'Staff',
      recordedAt: p.recordedAt,
    })),
  };
};

// ─── Mark overdue members (background job) ───────────────
const markOverdueMembers = async () => {
  // Members whose plan has expired AND haven't paid in full
  const result = await Member.updateMany(
    {
      paymentStatus: { $in: ['unpaid', 'partial'] },
      'plan.expiryDate': { $lt: new Date() },
      'billing.remainingBalance': { $gt: 0 },
    },
    { $set: { paymentStatus: 'overdue' } }
  );

  if (result.modifiedCount > 0) {
    console.log(`⚠️  Marked ${result.modifiedCount} members as overdue`);
  }

  return result.modifiedCount;
};

module.exports = {
  recordDuesPayment, setMemberDues,
  getDuesOverview, listMembersByPaymentStatus,
  getMemberPaymentHistory, markOverdueMembers,
};
