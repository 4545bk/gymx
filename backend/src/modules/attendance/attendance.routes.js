const express = require('express');
const router = express.Router();
const ctrl = require('./attendance.controller');
const auth = require('../../middleware/auth');
const roleGuard = require('../../middleware/roleGuard');

router.use(auth);
router.get('/', roleGuard(['owner', 'receptionist', 'trainer']), ctrl.list);
router.get('/summary', roleGuard(['owner', 'receptionist']), ctrl.dailySummary);

module.exports = router;
