/**
 * Settings Routes — Owner-only admin endpoints.
 */
const express = require('express');
const router = express.Router();
const ctrl = require('./settings.controller');
const auth = require('../../middleware/auth');
const roleGuard = require('../../middleware/roleGuard');
const validate = require('../../middleware/validate');
const { updateSettingsSchema, createPlanSchema, updatePlanSchema } = require('./settings.validation');

router.use(auth);

// ─── Public (any authenticated staff) ────────────────────
// Active plans needed by receptionists during member registration/renewal
router.get('/plans/active', ctrl.getActivePlans);

// ─── Owner-only below ────────────────────────────────────
router.use(roleGuard(['owner']));

// ─── Settings ────────────────────────────────────────────
router.get('/', ctrl.getSettings);
router.put('/', validate(updateSettingsSchema), ctrl.updateSettings);

// ─── Membership Plans ────────────────────────────────────
router.get('/plans', ctrl.getPlans);
router.post('/plans', validate(createPlanSchema), ctrl.createPlan);
router.put('/plans/:id', validate(updatePlanSchema), ctrl.updatePlan);
router.delete('/plans/:id', ctrl.deletePlan);

// ─── Backup ──────────────────────────────────────────────
router.post('/backup', ctrl.createBackup);

// ─── Restore ─────────────────────────────────────────────
router.post('/restore/validate', ctrl.validateBackup);
router.post('/restore', ctrl.restoreBackup);

module.exports = router;
