const express = require('express');
const router = express.Router();
const ctrl = require('./inventory.controller');
const auth = require('../../middleware/auth');
const roleGuard = require('../../middleware/roleGuard');
const validate = require('../../middleware/validate');
const { createInventorySchema, updateInventorySchema, logMaintenanceSchema } = require('./inventory.validation');

router.use(auth);

router.get('/', roleGuard(['owner', 'receptionist']), ctrl.list);
router.post('/', roleGuard(['owner']), validate(createInventorySchema), ctrl.create);
router.get('/:itemId', roleGuard(['owner', 'receptionist']), ctrl.getOne);
router.put('/:itemId', roleGuard(['owner']), validate(updateInventorySchema), ctrl.update);
router.patch('/:itemId/maintenance', roleGuard(['owner', 'receptionist']), validate(logMaintenanceSchema), ctrl.logMaintenance);
router.delete('/:itemId', roleGuard(['owner']), ctrl.retire);

module.exports = router;
