/**
 * Reports Service — Aggregation pipelines for analytics.
 * These endpoints are intentionally separate from data endpoints.
 * They run slower aggregation queries — acceptable for reports, NOT for check-in.
 */
const Attendance = require('../../models/Attendance');
const Payment = require('../../models/Payment');
const Member = require('../../models/Member');

/**
 * Attendance report with time-series data.
 */
const getAttendanceReport = async (query) => {
  const { from, to, groupBy = 'day' } = query;

  const matchFilter = {};
  if (from || to) {
    matchFilter.date = {};
    if (from) matchFilter.date.$gte = from;
    if (to) matchFilter.date.$lte = to;
  }

  // Get total stats
  const [totalCheckins, deniedEntries, denialBreakdown, series] = await Promise.all([
    Attendance.countDocuments({ ...matchFilter, status: 'granted' }),
    Attendance.countDocuments({ ...matchFilter, status: 'denied' }),
    Attendance.aggregate([
      { $match: { ...matchFilter, status: 'denied' } },
      { $group: { _id: '$denyReason', count: { $sum: 1 } } },
    ]),
    getAttendanceSeries(matchFilter, groupBy),
  ]);

  const byDenialReason = {};
  denialBreakdown.forEach((d) => { byDenialReason[d._id] = d.count; });

  // Find peak day
  let peakDay = null;
  if (series.length > 0) {
    peakDay = series.reduce((max, item) =>
      (item.granted > (max?.count || 0)) ? { date: item.date, count: item.granted } : max,
      null
    );
  }

  // Days in range for average
  const days = series.length || 1;

  return {
    period: { from: from || 'all', to: to || 'all' },
    totalCheckins,
    averagePerDay: Math.round(totalCheckins / days),
    peakDay,
    deniedEntries,
    byDenialReason,
    series,
  };
};

const getAttendanceSeries = async (matchFilter, groupBy) => {
  let groupId;
  if (groupBy === 'day') {
    groupId = '$date';
  } else if (groupBy === 'week') {
    groupId = { $substr: ['$date', 0, 7] }; // Approximate by month prefix
  } else {
    groupId = { $substr: ['$date', 0, 7] }; // YYYY-MM
  }

  const results = await Attendance.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: groupId,
        granted: { $sum: { $cond: [{ $eq: ['$status', 'granted'] }, 1, 0] } },
        denied: { $sum: { $cond: [{ $eq: ['$status', 'denied'] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return results.map((r) => ({
    date: r._id,
    granted: r.granted,
    denied: r.denied,
  }));
};

/**
 * Revenue report with time-series data.
 */
const getRevenueReport = async (query) => {
  const { from, to, groupBy = 'month' } = query;

  const matchFilter = { voided: { $ne: true }, reversalOf: null };
  if (from || to) {
    matchFilter.recordedAt = {};
    if (from) matchFilter.recordedAt.$gte = new Date(from);
    if (to) matchFilter.recordedAt.$lte = new Date(to + 'T23:59:59Z');
  }

  const [incomeTotal, expenseTotal, series] = await Promise.all([
    Payment.aggregate([
      { $match: { ...matchFilter, direction: 'in' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      { $match: { ...matchFilter, direction: 'out' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    getRevenueSeries(matchFilter, groupBy),
  ]);

  const totalIncome = incomeTotal[0]?.total || 0;
  const totalExpenses = expenseTotal[0]?.total || 0;

  return {
    period: { from: from || 'all', to: to || 'all' },
    totalIncome,
    totalExpenses,
    netProfit: totalIncome - totalExpenses,
    series,
  };
};

const getRevenueSeries = async (matchFilter, groupBy) => {
  const groupId = {
    year: { $year: '$recordedAt' },
    month: { $month: '$recordedAt' },
  };

  const results = await Payment.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: groupId,
        income: { $sum: { $cond: [{ $eq: ['$direction', 'in'] }, '$amount', 0] } },
        expenses: { $sum: { $cond: [{ $eq: ['$direction', 'out'] }, '$amount', 0] } },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  return results.map((r) => ({
    month: `${r._id.year}-${String(r._id.month).padStart(2, '0')}`,
    income: r.income,
    expenses: r.expenses,
    profit: r.income - r.expenses,
  }));
};

/**
 * Members report — growth and status breakdown.
 */
const getMembersReport = async () => {
  const { getDaysUntilExpiry } = require('../../utils/dateHelpers');

  const [statusBreakdown, planBreakdown, newThisMonth, allActive] = await Promise.all([
    Member.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Member.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$plan.type', count: { $sum: 1 } } },
    ]),
    Member.countDocuments({
      createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
    }),
    Member.find({ status: 'active' }).select('plan.expiryDate').lean(),
  ]);

  const statusMap = {};
  statusBreakdown.forEach((s) => { statusMap[s._id] = s.count; });

  const byPlan = {};
  planBreakdown.forEach((p) => { byPlan[p._id] = p.count; });

  // Count expiring members
  let expiringIn7Days = 0;
  let expiringIn30Days = 0;
  allActive.forEach((m) => {
    const days = getDaysUntilExpiry(m.plan.expiryDate);
    if (days >= 0 && days <= 7) expiringIn7Days++;
    if (days >= 0 && days <= 30) expiringIn30Days++;
  });

  // Churn = members who expired this month
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const churnedThisMonth = await Member.countDocuments({
    status: 'expired',
    updatedAt: { $gte: monthStart },
  });

  return {
    totalActive: statusMap.active || 0,
    totalExpired: statusMap.expired || 0,
    totalSuspended: statusMap.suspended || 0,
    totalFrozen: statusMap.frozen || 0,
    byPlan,
    expiringIn7Days,
    expiringIn30Days,
    newThisMonth,
    churnedThisMonth,
  };
};

/**
 * Revenue breakdown — membership vs product revenue by month.
 */
const getRevenueBreakdown = async (months = 6) => {
  const Sale = require('../../models/Sale');
  const start = new Date();
  start.setMonth(start.getMonth() - months);
  start.setDate(1);

  const [membershipRevenue, productRevenue] = await Promise.all([
    Payment.aggregate([
      { $match: { direction: 'in', type: 'membership', voided: { $ne: true }, recordedAt: { $gte: start } } },
      { $group: { _id: { year: { $year: '$recordedAt' }, month: { $month: '$recordedAt' } }, total: { $sum: '$amount' } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    Sale.aggregate([
      { $match: { voided: { $ne: true }, saleDate: { $gte: start } } },
      { $group: { _id: { year: { $year: '$saleDate' }, month: { $month: '$saleDate' } }, total: { $sum: '$total' } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
  ]);

  // Merge into unified monthly series
  const monthMap = {};
  membershipRevenue.forEach(r => {
    const key = `${r._id.year}-${String(r._id.month).padStart(2, '0')}`;
    monthMap[key] = { month: key, membership: r.total, product: 0 };
  });
  productRevenue.forEach(r => {
    const key = `${r._id.year}-${String(r._id.month).padStart(2, '0')}`;
    if (!monthMap[key]) monthMap[key] = { month: key, membership: 0, product: 0 };
    monthMap[key].product = r.total;
  });

  const series = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));
  const totalMembership = series.reduce((s, m) => s + m.membership, 0);
  const totalProduct = series.reduce((s, m) => s + m.product, 0);

  return { series, totalMembership, totalProduct, totalRevenue: totalMembership + totalProduct };
};

/**
 * Retention metrics — at-risk members, churn rate, renewal rate.
 */
const getRetentionMetrics = async () => {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const fourteenDaysAgoStr = fourteenDaysAgo.toISOString().split('T')[0];

  // Active members who haven't checked in for 14+ days
  const activeMembers = await Member.find({ status: 'active' }).select('memberId fullName plan phone').lean();
  const recentCheckins = await Attendance.distinct('memberId', {
    date: { $gte: fourteenDaysAgoStr },
    status: 'granted',
  });
  const recentSet = new Set(recentCheckins);
  const atRisk = activeMembers
    .filter(m => !recentSet.has(m.memberId))
    .map(m => ({ memberId: m.memberId, fullName: m.fullName, phone: m.phone, expiryDate: m.plan?.expiryDate }))
    .slice(0, 50);

  // Churn rate: expired this month / total active
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [churnedThisMonth, totalActive, renewedThisMonth] = await Promise.all([
    Member.countDocuments({ status: 'expired', updatedAt: { $gte: monthStart } }),
    Member.countDocuments({ status: 'active' }),
    // Renewed = members who got a plan update this month (plan.startDate in current month)
    Member.countDocuments({
      status: 'active',
      'plan.startDate': { $gte: monthStart },
      createdAt: { $lt: monthStart }, // Exclude new registrations
    }),
  ]);

  const churnRate = totalActive > 0 ? Math.round((churnedThisMonth / (totalActive + churnedThisMonth)) * 100) : 0;
  const renewalRate = totalActive > 0 ? Math.round((renewedThisMonth / totalActive) * 100) : 0;

  return { atRisk, atRiskCount: atRisk.length, churnedThisMonth, churnRate, renewedThisMonth, renewalRate, totalActive };
};

/**
 * Staff performance — check-ins processed, sales, payments recorded per staff member.
 */
const getStaffPerformance = async () => {
  const Staff = require('../../models/Staff');
  const Sale = require('../../models/Sale');
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const monthStartStr = monthStart.toISOString().split('T')[0];

  const [checkinsByStaff, salesByStaff, staffList] = await Promise.all([
    Attendance.aggregate([
      { $match: { date: { $gte: monthStartStr }, status: 'granted' } },
      { $group: { _id: '$processedBy', count: { $sum: 1 } } },
    ]),
    Sale.aggregate([
      { $match: { voided: { $ne: true }, saleDate: { $gte: monthStart } } },
      { $group: { _id: '$soldBy', count: { $sum: 1 }, revenue: { $sum: '$total' } } },
    ]),
    Staff.find({ active: true }).select('fullName role').lean(),
  ]);

  const staffMap = {};
  staffList.forEach(s => {
    staffMap[s._id.toString()] = { id: s._id, fullName: s.fullName, role: s.role, checkins: 0, sales: 0, salesRevenue: 0 };
  });
  checkinsByStaff.forEach(c => {
    const key = c._id?.toString();
    if (key && staffMap[key]) staffMap[key].checkins = c.count;
  });
  salesByStaff.forEach(s => {
    const key = s._id?.toString();
    if (key && staffMap[key]) { staffMap[key].sales = s.count; staffMap[key].salesRevenue = s.revenue; }
  });

  return Object.values(staffMap).sort((a, b) => (b.checkins + b.sales) - (a.checkins + a.sales));
};

module.exports = { getAttendanceReport, getRevenueReport, getMembersReport, getRevenueBreakdown, getRetentionMetrics, getStaffPerformance };
