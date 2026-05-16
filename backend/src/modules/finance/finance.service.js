/**
 * Finance Service — Immutable payment ledger.
 * Payments are never updated. Cancellations insert reversal documents.
 */
const Payment = require('../../models/Payment');
const Member = require('../../models/Member');

const createPayment = async (data, staffId) => {
  let memberName = null;
  let planType = null;

  // If membership payment, snapshot member data
  if (data.memberRef) {
    const member = await Member.findById(data.memberRef).lean();
    if (!member) {
      const err = new Error('Member not found');
      err.statusCode = 404;
      err.code = 'MEMBER_NOT_FOUND';
      throw err;
    }
    memberName = member.fullName;
    planType = member.plan?.type || null;
  }

  const payment = await Payment.create({
    ...data,
    memberName,
    planType,
    recordedBy: staffId,
    recordedAt: new Date(),
  });

  // Update member paymentSummary (denormalized)
  if (data.memberRef && data.direction === 'in') {
    await Member.findByIdAndUpdate(data.memberRef, {
      'paymentSummary.lastPaidDate': new Date(),
      'paymentSummary.lastPaidAmount': data.amount,
    });
  }

  return payment;
};

const listPayments = async (query) => {
  const { direction, type, memberId, from, to, page = 1, limit = 20 } = query;
  const filter = {};

  if (direction) filter.direction = direction;
  if (type) filter.type = type;
  if (memberId) {
    const member = await Member.findOne({ memberId }).lean();
    if (member) filter.memberRef = member._id;
  }
  if (from || to) {
    filter.recordedAt = {};
    if (from) filter.recordedAt.$gte = new Date(from);
    if (to) filter.recordedAt.$lte = new Date(to + 'T23:59:59Z');
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .sort({ recordedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('recordedBy', 'fullName')
      .lean(),
    Payment.countDocuments(filter),
  ]);

  const data = payments.map((p) => ({
    id: p._id,
    type: p.type,
    direction: p.direction,
    memberName: p.memberName,
    amount: p.amount,
    currency: p.currency,
    paymentMethod: p.paymentMethod,
    description: p.description,
    expenseCategory: p.expenseCategory,
    period: p.period,
    voided: p.voided,
    recordedBy: p.recordedBy?.fullName || 'Unknown',
    recordedAt: p.recordedAt,
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

const getPaymentById = async (paymentId) => {
  const payment = await Payment.findById(paymentId).populate('recordedBy', 'fullName').lean();
  if (!payment) {
    const err = new Error('Payment not found');
    err.statusCode = 404;
    err.code = 'PAYMENT_NOT_FOUND';
    throw err;
  }
  // Add flat name field for receipt generation
  payment.recordedByName = payment.recordedBy?.fullName || 'Staff';
  return payment;
};

/**
 * Void a payment — insert reversal document, mark original as voided.
 */
const voidPayment = async (paymentId, staffId) => {
  const original = await Payment.findById(paymentId);
  if (!original) {
    const err = new Error('Payment not found');
    err.statusCode = 404;
    err.code = 'PAYMENT_NOT_FOUND';
    throw err;
  }
  if (original.voided) {
    const err = new Error('Payment already voided');
    err.statusCode = 400;
    err.code = 'ALREADY_VOIDED';
    throw err;
  }

  // Create reversal document
  const reversal = await Payment.create({
    type: original.type,
    direction: original.direction === 'in' ? 'out' : 'in',
    memberRef: original.memberRef,
    memberName: original.memberName,
    planType: original.planType,
    staffRef: original.staffRef,
    expenseCategory: original.expenseCategory,
    description: `REVERSAL: ${original.description}`,
    amount: original.amount,
    currency: original.currency,
    paymentMethod: original.paymentMethod,
    period: original.period,
    reversalOf: original._id,
    recordedBy: staffId,
    recordedAt: new Date(),
  });

  // Mark original as voided
  original.voided = true;
  await original.save();

  return { voided: true, reversalId: reversal._id };
};

/**
 * Monthly P&L summary.
 */
const getSummary = async (month, year) => {
  const matchFilter = {
    'period.month': parseInt(month),
    'period.year': parseInt(year),
    voided: { $ne: true },
    reversalOf: null,
  };

  const [incomeResult, expenseResult, membershipCount] = await Promise.all([
    Payment.aggregate([
      { $match: { ...matchFilter, direction: 'in' } },
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      { $match: { ...matchFilter, direction: 'out' } },
      { $group: { _id: '$expenseCategory', total: { $sum: '$amount' } } },
    ]),
    Payment.countDocuments({ ...matchFilter, type: 'membership', direction: 'in' }),
  ]);

  const incomeBreakdown = {};
  let totalIncome = 0;
  incomeResult.forEach((r) => {
    incomeBreakdown[r._id] = r.total;
    totalIncome += r.total;
  });

  const expenseBreakdown = {};
  let totalExpenses = 0;
  expenseResult.forEach((r) => {
    expenseBreakdown[r._id || 'other'] = r.total;
    totalExpenses += r.total;
  });

  return {
    period: { month: parseInt(month), year: parseInt(year) },
    income: { total: totalIncome, breakdown: incomeBreakdown },
    expenses: { total: totalExpenses, breakdown: expenseBreakdown },
    netProfit: totalIncome - totalExpenses,
    membershipCount,
  };
};

module.exports = { createPayment, listPayments, getPaymentById, voidPayment, getSummary };
