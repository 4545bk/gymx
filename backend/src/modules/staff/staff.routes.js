const express = require('express');
const router = express.Router();
const ctrl = require('./staff.controller');
const auth = require('../../middleware/auth');
const roleGuard = require('../../middleware/roleGuard');
const validate = require('../../middleware/validate');
const { createStaffSchema, updateStaffSchema, updateStatusSchema } = require('./staff.validation');

router.use(auth);

router.get('/', roleGuard(['owner']), ctrl.list);
router.post('/', roleGuard(['owner']), validate(createStaffSchema), ctrl.create);
router.get('/:staffId', roleGuard(['owner', 'receptionist', 'trainer']), ctrl.getOne);
router.put('/:staffId', roleGuard(['owner']), validate(updateStaffSchema), ctrl.update);
router.patch('/:staffId/status', roleGuard(['owner']), validate(updateStatusSchema), ctrl.updateStatus);
router.patch('/:staffId/password', auth, ctrl.changePassword);
router.get('/:staffId/members', roleGuard(['owner', 'receptionist', 'trainer']), ctrl.getMembers);

module.exports = router;
