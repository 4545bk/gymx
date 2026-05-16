/**
 * Staff Controller.
 */
const staffService = require('./staff.service');
const { changePasswordSchema } = require('../auth/auth.validation');

const create = async (req, res, next) => {
  try {
    const staff = await staffService.createStaff(req.body);
    res.status(201).json({ success: true, data: staff });
  } catch (err) { next(err); }
};

const list = async (req, res, next) => {
  try {
    const result = await staffService.listStaff(req.query);
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};

const getOne = async (req, res, next) => {
  try {
    const staff = await staffService.getStaffById(req.params.staffId);
    res.status(200).json({ success: true, data: staff });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const staff = await staffService.updateStaff(req.params.staffId, req.body);
    res.status(200).json({ success: true, data: staff });
  } catch (err) { next(err); }
};

const updateStatus = async (req, res, next) => {
  try {
    const result = await staffService.updateStatus(req.params.staffId, req.body.status);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

const changePassword = async (req, res, next) => {
  try {
    const parsed = changePasswordSchema.parse(req.body);
    await staffService.changePassword(
      req.params.staffId, parsed.currentPassword, parsed.newPassword, req.staff
    );
    res.status(200).json({ success: true, data: null });
  } catch (err) { next(err); }
};

const getMembers = async (req, res, next) => {
  try {
    const result = await staffService.getTrainerMembers(req.params.staffId, req.staff);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

module.exports = { create, list, getOne, update, updateStatus, changePassword, getMembers };
