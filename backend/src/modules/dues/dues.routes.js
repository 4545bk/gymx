/**
 * Dues Routes — Membership payment tracking.
 */
const express = require('express');
const router = express.Router();
const ctrl = require('./dues.controller');
const auth = require('../../middleware/auth');
const roleGuard = require('../../middleware/roleGuard');
const validate = require('../../middleware/validate');
const { recordDuesPaymentSchema, setDuesSchema } = require('./dues.validation');

router.use(auth);

// GET /dues/overview — dashboard summary
router.get('/overview', roleGuard(['owner', 'receptionist']), ctrl.getOverview);

// GET /dues/members — list members by payment status
router.get('/members', roleGuard(['owner', 'receptionist']), ctrl.listMembers);

// POST /dues/pay — record a dues payment
router.post('/pay', roleGuard(['owner', 'receptionist']), validate(recordDuesPaymentSchema), ctrl.recordPayment);

// PUT /dues/:memberId/set — set total due for a member
router.put('/:memberId/set', roleGuard(['owner']), validate(setDuesSchema), ctrl.setDues);

// GET /dues/:memberId/history — payment history
router.get('/:memberId/history', roleGuard(['owner', 'receptionist']), ctrl.getHistory);

module.exports = router;
