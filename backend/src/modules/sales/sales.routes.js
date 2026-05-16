/**
 * Sales Routes.
 */
const express = require('express');
const router = express.Router();
const ctrl = require('./sales.controller');
const auth = require('../../middleware/auth');
const roleGuard = require('../../middleware/roleGuard');
const validate = require('../../middleware/validate');
const { createSaleSchema, voidSaleSchema } = require('./sales.validation');

router.use(auth);

// GET /sales — list
router.get('/', roleGuard(['owner', 'receptionist']), ctrl.list);

// GET /sales/analytics — sales analytics
router.get('/analytics', roleGuard(['owner']), ctrl.analytics);

// POST /sales — create new sale (POS)
router.post('/', roleGuard(['owner', 'receptionist']), validate(createSaleSchema), ctrl.create);

// GET /sales/:id — single sale detail
router.get('/:id', roleGuard(['owner', 'receptionist']), ctrl.getOne);

// GET /sales/:id/receipt — download sale receipt PDF
router.get('/:id/receipt', roleGuard(['owner', 'receptionist']), ctrl.downloadReceipt);

// PATCH /sales/:id/void — void a sale (owner only)
router.patch('/:id/void', roleGuard(['owner']), validate(voidSaleSchema), ctrl.voidSale);

module.exports = router;
