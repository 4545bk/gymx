/**
 * Members Routes.
 * All 9 member endpoints per the API spec.
 */
const express = require('express');
const router = express.Router();
const ctrl = require('./members.controller');
const importCtrl = require('./import.controller');
const auth = require('../../middleware/auth');
const roleGuard = require('../../middleware/roleGuard');
const validate = require('../../middleware/validate');
const {
  createMemberSchema,
  updateMemberSchema,
  updatePlanSchema,
  updateStatusSchema,
} = require('./members.validation');

// All routes require authentication
router.use(auth);

// ─── Import routes (MUST be before /:memberId to avoid param capture) ───
router.post('/import/preview', roleGuard(['owner', 'receptionist']), importCtrl.uploadMiddleware, importCtrl.preview);
router.post('/import/confirm', roleGuard(['owner', 'receptionist']), importCtrl.confirm);

// GET /members — list with filters (owner, receptionist, trainer)
router.get('/', roleGuard(['owner', 'receptionist', 'trainer']), ctrl.list);

// POST /members — register new member (owner, receptionist)
router.post('/', roleGuard(['owner', 'receptionist']), validate(createMemberSchema), ctrl.create);

// GET /members/:memberId — single member profile
router.get('/:memberId', roleGuard(['owner', 'receptionist', 'trainer']), ctrl.getOne);

// PUT /members/:memberId — update personal info
router.put('/:memberId', roleGuard(['owner', 'receptionist']), validate(updateMemberSchema), ctrl.update);

// PATCH /members/:memberId/plan — renew or change plan
router.patch('/:memberId/plan', roleGuard(['owner', 'receptionist']), validate(updatePlanSchema), ctrl.updatePlan);

// PATCH /members/:memberId/status — suspend, freeze, reactivate
router.patch('/:memberId/status', roleGuard(['owner', 'receptionist']), validate(updateStatusSchema), ctrl.updateStatus);

// DELETE /members/:memberId — soft delete (owner only)
router.delete('/:memberId', roleGuard(['owner']), ctrl.remove);

// GET /members/:memberId/qr — QR code image
router.get('/:memberId/qr', roleGuard(['owner', 'receptionist']), ctrl.getQR);

// GET /members/:memberId/attendance — member's visit history
router.get('/:memberId/attendance', roleGuard(['owner', 'receptionist', 'trainer']), ctrl.getAttendance);

// GET /members/:memberId/card — download printable membership card PDF
router.get('/:memberId/card', roleGuard(['owner', 'receptionist']), ctrl.downloadCard);

// PUT /members/:memberId/photo — upload or update member photo
router.put('/:memberId/photo', roleGuard(['owner', 'receptionist']), ctrl.uploadPhoto);

module.exports = router;
