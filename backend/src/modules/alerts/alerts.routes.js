const express = require('express');
const router = express.Router();
const ctrl = require('./alerts.controller');
const auth = require('../../middleware/auth');
const roleGuard = require('../../middleware/roleGuard');

router.use(auth);

router.get('/', roleGuard(['owner', 'receptionist']), ctrl.list);
router.get('/count', roleGuard(['owner', 'receptionist']), ctrl.count);
router.patch('/:alertId/read', roleGuard(['owner', 'receptionist']), ctrl.markRead);
router.delete('/:alertId', roleGuard(['owner']), ctrl.dismiss);

module.exports = router;
