const express = require('express');
const router = express.Router();
const ctrl = require('./reports.controller');
const auth = require('../../middleware/auth');
const roleGuard = require('../../middleware/roleGuard');

router.use(auth);

router.get('/attendance', roleGuard(['owner', 'receptionist']), ctrl.attendance);
router.get('/revenue', roleGuard(['owner']), ctrl.revenue);
router.get('/members', roleGuard(['owner', 'receptionist']), ctrl.members);
router.get('/revenue-breakdown', roleGuard(['owner']), ctrl.revenueBreakdown);
router.get('/retention', roleGuard(['owner']), ctrl.retention);
router.get('/staff-performance', roleGuard(['owner']), ctrl.staffPerformance);

module.exports = router;
