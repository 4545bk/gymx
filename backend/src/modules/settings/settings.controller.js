/**
 * Settings Controller — Request/response handling.
 */
const settingsService = require('./settings.service');

// ─── Settings ────────────────────────────────────────────
const getSettings = async (req, res, next) => {
  try {
    const settings = await settingsService.getSettings();
    res.status(200).json({ success: true, data: settings });
  } catch (err) { next(err); }
};

const updateSettings = async (req, res, next) => {
  try {
    const settings = await settingsService.updateSettings(req.body, req.staff.id, req.staff.fullName);
    res.status(200).json({ success: true, data: settings });
  } catch (err) { next(err); }
};

// ─── Plans ───────────────────────────────────────────────
const getPlans = async (req, res, next) => {
  try {
    const plans = await settingsService.getPlans();
    res.status(200).json({ success: true, data: plans });
  } catch (err) { next(err); }
};

const getActivePlans = async (req, res, next) => {
  try {
    const plans = await settingsService.getActivePlans();
    res.status(200).json({ success: true, data: plans });
  } catch (err) { next(err); }
};

const createPlan = async (req, res, next) => {
  try {
    const plan = await settingsService.createPlan(req.body, req.staff.id, req.staff.fullName);
    res.status(201).json({ success: true, data: plan });
  } catch (err) { next(err); }
};

const updatePlan = async (req, res, next) => {
  try {
    const plan = await settingsService.updatePlan(req.params.id, req.body, req.staff.id, req.staff.fullName);
    res.status(200).json({ success: true, data: plan });
  } catch (err) { next(err); }
};

const deletePlan = async (req, res, next) => {
  try {
    const result = await settingsService.deletePlan(req.params.id, req.staff.id, req.staff.fullName);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

// ─── Backup ──────────────────────────────────────────────
const createBackup = async (req, res, next) => {
  try {
    const backup = await settingsService.createBackup(req.staff.id, req.staff.fullName);
    const filename = `GymX_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(JSON.stringify(backup, null, 2));
  } catch (err) { next(err); }
};

// ─── Restore ─────────────────────────────────────────────
const validateBackup = async (req, res, next) => {
  try {
    const result = settingsService.validateBackup(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

const restoreBackup = async (req, res, next) => {
  try {
    const results = await settingsService.restoreBackup(req.body, req.staff.id, req.staff.fullName);
    res.status(200).json({ success: true, data: results });
  } catch (err) { next(err); }
};

module.exports = {
  getSettings, updateSettings,
  getPlans, getActivePlans, createPlan, updatePlan, deletePlan,
  createBackup, validateBackup, restoreBackup,
};
