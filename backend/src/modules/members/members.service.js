/**
 * Members Service — Business logic for member management.
 * Handles registration, QR generation, plan renewal, status changes.
 * CRITICAL: Every write to a member document MUST invalidate Redis cache.
 */
const Member = require('../../models/Member');
const Attendance = require('../../models/Attendance');
const { generateMemberId } = require('../../utils/memberIdGenerator');
const { generateQRCode } = require('../../utils/qrGenerator');
const { computeExpiryDate, getDaysUntilExpiry, getTodayDateString } = require('../../utils/dateHelpers');
const { safeDel, safeSet } = require('../../config/redis');

/**
 * Build the Redis cache payload for a member (only check-in fields).
 */
const buildCachePayload = (member) => {
  return JSON.stringify({
    _id: member._id,
    memberId: member.memberId,
    fullName: member.fullName,
    status: member.status,
    plan: {
      type: member.plan.type,
      allowedDays: member.plan.allowedDays,
      expiryDate: member.plan.expiryDate,
    },
  });
};

/**
 * Invalidate Redis cache for a member.
 */
const invalidateCache = async (memberId) => {
  await safeDel(`member:${memberId}`);
};

/**
 * Seed Redis cache for a member.
 */
const seedCache = async (member) => {
  const payload = buildCachePayload(member);
  await safeSet(`member:${member.memberId}`, payload, 86400);
};

/**
 * Register a new member.
 * Flow: validate → check duplicate phone → generate memberId → compute expiry → generate QR → insert → seed cache
 */
const createMember = async (data, staffId) => {
  // Check for duplicate phone
  const existingPhone = await Member.findOne({ phone: data.phone }).lean();
  if (existingPhone) {
    const err = new Error('Phone number already registered');
    err.statusCode = 409;
    err.code = 'PHONE_ALREADY_EXISTS';
    throw err;
  }

  // Generate unique memberId
  const memberId = await generateMemberId();

  // Compute expiry date
  const expiryDate = computeExpiryDate(data.plan.startDate, data.plan.durationMonths);

  // Generate QR code
  const qrCodeBase64 = await generateQRCode(memberId);

  // Build member document
  const memberDoc = {
    memberId,
    fullName: data.fullName,
    phone: data.phone,
    photoUrl: data.photoUrl || null,
    emergencyContact: data.emergencyContact || {},
    qrCodeBase64,
    plan: {
      type: data.plan.type,
      allowedDays: data.plan.type === '3-day' ? data.plan.allowedDays : null,
      startDate: new Date(data.plan.startDate),
      expiryDate,
      durationMonths: data.plan.durationMonths,
    },
    status: 'active',
    paymentStatus: data.planPrice ? 'unpaid' : 'paid',
    billing: {
      totalDue: data.planPrice || 0,
      amountPaid: 0,
      remainingBalance: data.planPrice || 0,
      lastPaymentDate: null,
      lastPaymentAmount: 0,
      paymentCount: 0,
    },
    assignedTrainerId: data.assignedTrainerId || null,
    registeredBy: staffId,
  };

  const member = await Member.create(memberDoc);

  // Seed Redis cache immediately
  await seedCache(member);

  return {
    memberId: member.memberId,
    fullName: member.fullName,
    phone: member.phone,
    qrCodeBase64,
    plan: {
      type: member.plan.type,
      allowedDays: member.plan.allowedDays,
      startDate: member.plan.startDate,
      expiryDate: member.plan.expiryDate,
      durationMonths: member.plan.durationMonths,
    },
    status: member.status,
    createdAt: member.createdAt,
  };
};

/**
 * List members with filters, pagination, sorting.
 * Trainers automatically see only their assigned members.
 */
const listMembers = async (query, staffRole, staffId) => {
  const {
    search, status, plan, expiringInDays, trainerId,
    page = 1, limit = 20, sortBy = 'createdAt', order = 'desc',
  } = query;

  const filter = {};

  // Trainer filter: automatically append assignedTrainerId
  if (staffRole === 'trainer') {
    filter.assignedTrainerId = staffId;
  } else if (trainerId) {
    filter.assignedTrainerId = trainerId;
  }

  if (status) filter.status = status;
  if (plan) filter['plan.type'] = plan;

  if (expiringInDays) {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + parseInt(expiringInDays));
    filter['plan.expiryDate'] = { $lte: futureDate, $gte: today };
    filter.status = 'active';
  }

  if (search) {
    // Search by name (text index) or phone (exact prefix match)
    if (search.startsWith('+') || /^\d+$/.test(search)) {
      filter.phone = { $regex: search, $options: 'i' };
    } else {
      filter.$text = { $search: search };
    }
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sortOrder = order === 'asc' ? 1 : -1;
  const sortOptions = {};
  sortOptions[sortBy] = sortOrder;

  const [members, total] = await Promise.all([
    Member.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('assignedTrainerId', 'fullName')
      .lean(),
    Member.countDocuments(filter),
  ]);

  // Add computed daysRemaining to each member
  const data = members.map((m) => ({
    memberId: m.memberId,
    fullName: m.fullName,
    phone: m.phone,
    photoUrl: m.photoUrl || null,
    status: m.status,
    paymentStatus: m.paymentStatus || 'unpaid',
    plan: {
      type: m.plan.type,
      expiryDate: m.plan.expiryDate,
      daysRemaining: getDaysUntilExpiry(m.plan.expiryDate),
    },
    billing: m.billing || {},
    paymentSummary: m.paymentSummary,
    card: m.card || {},
    assignedTrainer: m.assignedTrainerId
      ? { id: m.assignedTrainerId._id, fullName: m.assignedTrainerId.fullName }
      : null,
    createdAt: m.createdAt,
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

/**
 * Get a single member by memberId string.
 */
const getMemberByMemberId = async (memberId, staffRole, staffId) => {
  const member = await Member.findOne({ memberId })
    .populate('assignedTrainerId', 'fullName')
    .populate('registeredBy', 'fullName');

  if (!member) {
    const err = new Error('Member not found');
    err.statusCode = 404;
    err.code = 'MEMBER_NOT_FOUND';
    throw err;
  }

  // Trainer can only see their assigned members
  if (staffRole === 'trainer' && 
      String(member.assignedTrainerId?._id) !== String(staffId)) {
    const err = new Error('Access denied');
    err.statusCode = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  // Get attendance stats
  const today = getTodayDateString();
  const monthStart = today.substring(0, 7) + '-01';
  const [totalVisits, visitsThisMonth, lastVisit] = await Promise.all([
    Attendance.countDocuments({ memberId, status: 'granted' }),
    Attendance.countDocuments({ memberId, status: 'granted', date: { $gte: monthStart } }),
    Attendance.findOne({ memberId, status: 'granted' }).sort({ checkedInAt: -1 }).lean(),
  ]);

  return {
    memberId: member.memberId,
    fullName: member.fullName,
    phone: member.phone,
    photoUrl: member.photoUrl,
    emergencyContact: member.emergencyContact,
    status: member.status,
    plan: {
      type: member.plan.type,
      allowedDays: member.plan.allowedDays,
      startDate: member.plan.startDate,
      expiryDate: member.plan.expiryDate,
      durationMonths: member.plan.durationMonths,
      daysRemaining: getDaysUntilExpiry(member.plan.expiryDate),
    },
    paymentSummary: member.paymentSummary,
    paymentStatus: member.paymentStatus || 'unpaid',
    billing: member.billing || {},
    card: member.card || {},
    assignedTrainer: member.assignedTrainerId
      ? { id: member.assignedTrainerId._id, fullName: member.assignedTrainerId.fullName }
      : null,
    registeredBy: member.registeredBy
      ? { id: member.registeredBy._id, fullName: member.registeredBy.fullName }
      : null,
    stats: {
      totalVisits,
      visitsThisMonth,
      lastVisit: lastVisit ? lastVisit.date : null,
    },
    createdAt: member.createdAt,
  };
};

/**
 * Update member personal info (NOT plan — that has its own endpoint).
 */
const updateMember = async (memberId, data) => {
  const member = await Member.findOne({ memberId });
  if (!member) {
    const err = new Error('Member not found');
    err.statusCode = 404;
    err.code = 'MEMBER_NOT_FOUND';
    throw err;
  }

  // Check phone uniqueness if changing
  if (data.phone && data.phone !== member.phone) {
    const existing = await Member.findOne({ phone: data.phone }).lean();
    if (existing) {
      const err = new Error('Phone number already registered');
      err.statusCode = 409;
      err.code = 'PHONE_ALREADY_EXISTS';
      throw err;
    }
  }

  Object.assign(member, data);
  await member.save();

  // CRITICAL: Invalidate Redis cache
  await invalidateCache(memberId);

  return member;
};

/**
 * Renew or change plan.
 * Recomputes expiry, sets status to active, invalidates Redis.
 */
const updatePlan = async (memberId, planData) => {
  const member = await Member.findOne({ memberId });
  if (!member) {
    const err = new Error('Member not found');
    err.statusCode = 404;
    err.code = 'MEMBER_NOT_FOUND';
    throw err;
  }

  const startDate = planData.startDate || getTodayDateString();
  const expiryDate = computeExpiryDate(startDate, planData.durationMonths);

  member.plan = {
    type: planData.type,
    allowedDays: planData.type === '3-day' ? planData.allowedDays : null,
    startDate: new Date(startDate),
    expiryDate,
    durationMonths: planData.durationMonths,
  };

  // Reactivate if previously expired
  member.status = 'active';

  // Reset billing for new period if planPrice provided
  if (planData.planPrice) {
    member.billing = {
      totalDue: planData.planPrice,
      amountPaid: 0,
      remainingBalance: planData.planPrice,
      lastPaymentDate: null,
      lastPaymentAmount: 0,
      paymentCount: 0,
    };
    member.paymentStatus = 'unpaid';
    member.paymentSummary.outstandingBalance = planData.planPrice;
  }

  await member.save();

  // CRITICAL: Invalidate Redis cache
  await invalidateCache(memberId);

  return {
    plan: {
      type: member.plan.type,
      allowedDays: member.plan.allowedDays,
      startDate: member.plan.startDate,
      expiryDate: member.plan.expiryDate,
      durationMonths: member.plan.durationMonths,
    },
  };
};

/**
 * Change member status (suspend, freeze, reactivate).
 */
const updateStatus = async (memberId, statusData) => {
  const member = await Member.findOne({ memberId });
  if (!member) {
    const err = new Error('Member not found');
    err.statusCode = 404;
    err.code = 'MEMBER_NOT_FOUND';
    throw err;
  }

  // If reactivating, check that plan isn't expired
  if (statusData.status === 'active' && getDaysUntilExpiry(member.plan.expiryDate) < 0) {
    const err = new Error('Cannot reactivate — plan has expired. Renew plan first.');
    err.statusCode = 400;
    err.code = 'PLAN_EXPIRED';
    throw err;
  }

  member.status = statusData.status;
  await member.save();

  // CRITICAL: Invalidate Redis cache
  await invalidateCache(memberId);

  return { status: member.status };
};

/**
 * Get QR code for a member.
 */
const getQRCode = async (memberId) => {
  const member = await Member.findOne({ memberId }).select('+qrCodeBase64');
  if (!member) {
    const err = new Error('Member not found');
    err.statusCode = 404;
    err.code = 'MEMBER_NOT_FOUND';
    throw err;
  }

  // Regenerate if not stored
  let qrCodeBase64 = member.qrCodeBase64;
  if (!qrCodeBase64) {
    qrCodeBase64 = await generateQRCode(memberId);
    member.qrCodeBase64 = qrCodeBase64;
    await member.save();
  }

  return {
    memberId: member.memberId,
    qrCodeBase64,
  };
};

/**
 * Get member attendance history.
 */
const getMemberAttendance = async (memberId, query, staffRole, staffId) => {
  // Verify member exists and check trainer access
  const member = await Member.findOne({ memberId }).lean();
  if (!member) {
    const err = new Error('Member not found');
    err.statusCode = 404;
    err.code = 'MEMBER_NOT_FOUND';
    throw err;
  }

  if (staffRole === 'trainer' && String(member.assignedTrainerId) !== String(staffId)) {
    const err = new Error('Access denied');
    err.statusCode = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  const { from, to, page = 1, limit = 20 } = query;
  const filter = { memberId };
  if (from) filter.date = { ...filter.date, $gte: from };
  if (to) filter.date = { ...filter.date, $lte: to };

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [records, total, totalGranted, totalDenied] = await Promise.all([
    Attendance.find(filter).sort({ checkedInAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    Attendance.countDocuments(filter),
    Attendance.countDocuments({ ...filter, status: 'granted' }),
    Attendance.countDocuments({ ...filter, status: 'denied' }),
  ]);

  return {
    member: { fullName: member.fullName, memberId: member.memberId },
    records: records.map((r) => ({
      date: r.date,
      checkedInAt: r.checkedInAt,
      result: r.status,
      denyReason: r.denyReason,
    })),
    summary: { totalGranted, totalDenied },
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
};

/**
 * Soft delete a member (set status to expired, NOT actual delete).
 */
const deleteMember = async (memberId) => {
  const member = await Member.findOne({ memberId });
  if (!member) {
    const err = new Error('Member not found');
    err.statusCode = 404;
    err.code = 'MEMBER_NOT_FOUND';
    throw err;
  }

  member.status = 'expired';
  await member.save();

  // Invalidate Redis cache
  await invalidateCache(memberId);

  return { memberId, status: 'expired' };
};

module.exports = {
  createMember,
  listMembers,
  getMemberByMemberId,
  updateMember,
  updatePlan,
  updateStatus,
  getQRCode,
  getMemberAttendance,
  deleteMember,
  buildCachePayload,
  seedCache,
  invalidateCache,
};
