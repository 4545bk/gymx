const reportsService = require('./reports.service');

const attendance = async (req, res, next) => {
  try {
    const result = await reportsService.getAttendanceReport(req.query);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

const revenue = async (req, res, next) => {
  try {
    const result = await reportsService.getRevenueReport(req.query);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

const members = async (req, res, next) => {
  try {
    const result = await reportsService.getMembersReport();
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

const revenueBreakdown = async (req, res, next) => {
  try {
    const months = parseInt(req.query.months) || 6;
    const result = await reportsService.getRevenueBreakdown(months);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

const retention = async (req, res, next) => {
  try {
    const result = await reportsService.getRetentionMetrics();
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

const staffPerformance = async (req, res, next) => {
  try {
    const result = await reportsService.getStaffPerformance();
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

module.exports = { attendance, revenue, members, revenueBreakdown, retention, staffPerformance };
