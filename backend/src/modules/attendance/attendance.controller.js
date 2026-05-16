/**
 * Attendance Controller.
 */
const attendanceService = require('./attendance.service');
const { getTodayDateString } = require('../../utils/dateHelpers');

const list = async (req, res, next) => {
  try {
    const result = await attendanceService.listAttendance(req.query);
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};

const dailySummary = async (req, res, next) => {
  try {
    const date = req.query.date || getTodayDateString();
    const result = await attendanceService.getDailySummary(date);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

module.exports = { list, dailySummary };
