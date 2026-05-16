/**
 * Products Routes.
 */
const express = require('express');
const router = express.Router();
const ctrl = require('./products.controller');
const auth = require('../../middleware/auth');
const roleGuard = require('../../middleware/roleGuard');
const validate = require('../../middleware/validate');
const { createProductSchema, updateProductSchema, adjustStockSchema } = require('./products.validation');

router.use(auth);

// GET /products — list
router.get('/', roleGuard(['owner', 'receptionist']), ctrl.list);

// GET /products/low-stock — low stock alert list
router.get('/low-stock', roleGuard(['owner', 'receptionist']), ctrl.getLowStock);

// GET /products/movements — all inventory movements
router.get('/movements', roleGuard(['owner']), ctrl.getAllMovements);

// POST /products — create
router.post('/', roleGuard(['owner']), validate(createProductSchema), ctrl.create);

// GET /products/:id — single product
router.get('/:id', roleGuard(['owner', 'receptionist']), ctrl.getOne);

// PUT /products/:id — update product
router.put('/:id', roleGuard(['owner']), validate(updateProductSchema), ctrl.update);

// PATCH /products/:id/stock — adjust stock
router.patch('/:id/stock', roleGuard(['owner', 'receptionist']), validate(adjustStockSchema), ctrl.adjustStock);

// PATCH /products/:id/archive — archive product
router.patch('/:id/archive', roleGuard(['owner']), ctrl.archive);

// GET /products/:id/movements — product-specific movement history
router.get('/:id/movements', roleGuard(['owner', 'receptionist']), ctrl.getMovements);

module.exports = router;
