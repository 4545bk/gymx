/**
 * Attendance Service — Query historical check-in records.
 */
const Attendance = require('../../models/Attendance');
const Member = require('../../models/Member');

/**
 * Get attendance records with filters.
 */
const listAttendance = async (query) => {
  const { memberId, date, from, to, status, page = 1, limit = 20 } = query;
  const filter = {};

  if (memberId) filter.memberId = memberId;
  if (date) filter.date = date;
  if (status) filter.status = status;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = from;
    if (to) filter.date.$lte = to;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [records, total] = await Promise.all([
    Attendance.find(filter)
      .sort({ checkedInAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Attendance.countDocuments(filter),
  ]);

  // Enrich with member names
  const memberIds = [...new Set(records.map((r) => r.memberId))];
  const members = await Member.find({ memberId: { $in: memberIds } })
    .select('memberId fullName')
    .lean();
  const memberMap = {};
  members.forEach((m) => { memberMap[m.memberId] = m.fullName; });

  const data = records.map((r) => ({
    memberId: r.memberId,
    fullName: memberMap[r.memberId] || 'Unknown',
    date: r.date,
    checkedInAt: r.checkedInAt,
    result: r.status,
    denyReason: r.denyReason,
    planSnapshot: r.planSnapshot,
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
 * Get daily attendance summary.
 */
const getDailySummary = async (date) => {
  const [granted, denied] = await Promise.all([
    Attendance.countDocuments({ date, status: 'granted' }),
    Attendance.countDocuments({ date, status: 'denied' }),
  ]);

  const denialBreakdown = await Attendance.aggregate([
    { $match: { date, status: 'denied' } },
    { $group: { _id: '$denyReason', count: { $sum: 1 } } },
  ]);

  const byReason = {};
  denialBreakdown.forEach((d) => { byReason[d._id] = d.count; });

  return { date, granted, denied, total: granted + denied, byDenialReason: byReason };
};

module.exports = { listAttendance, getDailySummary };
