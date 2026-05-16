const express = require('express');
const router = express.Router();
const ctrl = require('./finance.controller');
const auth = require('../../middleware/auth');
const roleGuard = require('../../middleware/roleGuard');
const validate = require('../../middleware/validate');
const { createPaymentSchema } = require('./finance.validation');

router.use(auth);

router.get('/', roleGuard(['owner']), ctrl.list);
router.post('/', roleGuard(['owner', 'receptionist']), validate(createPaymentSchema), ctrl.create);
router.get('/summary', roleGuard(['owner']), ctrl.summary);
router.get('/:paymentId', roleGuard(['owner']), ctrl.getOne);
router.get('/:paymentId/receipt', roleGuard(['owner', 'receptionist']), ctrl.downloadReceipt);
router.delete('/:paymentId', roleGuard(['owner']), ctrl.voidPayment);

module.exports = router;
