/**
 * Dues Controller — Request/response handling.
 */
const duesService = require('./dues.service');

const recordPayment = async (req, res, next) => {
  try {
    const result = await duesService.recordDuesPayment(req.body, req.staff.id, req.staff.fullName);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

const setDues = async (req, res, next) => {
  try {
    const result = await duesService.setMemberDues(req.params.memberId, req.body.totalDue, req.staff.id, req.staff.fullName);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

const getOverview = async (req, res, next) => {
  try {
    const result = await duesService.getDuesOverview();
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

const listMembers = async (req, res, next) => {
  try {
    const result = await duesService.listMembersByPaymentStatus(req.query);
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};

const getHistory = async (req, res, next) => {
  try {
    const result = await duesService.getMemberPaymentHistory(req.params.memberId);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

module.exports = { recordPayment, setDues, getOverview, listMembers, getHistory };
