/**
 * Finance Controller.
 */
const financeService = require('./finance.service');
const { generatePaymentReceipt } = require('../../utils/receiptGenerator');

const create = async (req, res, next) => {
  try {
    // Receptionist can only record income
    if (req.staff.role === 'receptionist' && req.body.direction !== 'in') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Receptionists can only record income payments' },
      });
    }
    const payment = await financeService.createPayment(req.body, req.staff.id);
    res.status(201).json({ success: true, data: payment });
  } catch (err) { next(err); }
};

const list = async (req, res, next) => {
  try {
    const result = await financeService.listPayments(req.query);
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};

const getOne = async (req, res, next) => {
  try {
    const payment = await financeService.getPaymentById(req.params.paymentId);
    res.status(200).json({ success: true, data: payment });
  } catch (err) { next(err); }
};

const voidPayment = async (req, res, next) => {
  try {
    const result = await financeService.voidPayment(req.params.paymentId, req.staff.id);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

const summary = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const now = new Date();
    const result = await financeService.getSummary(
      month || (now.getMonth() + 1), year || now.getFullYear()
    );
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

const downloadReceipt = async (req, res, next) => {
  try {
    const payment = await financeService.getPaymentById(req.params.paymentId);
    const { stream, filename } = await generatePaymentReceipt(payment);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    stream.pipe(res);
  } catch (err) { next(err); }
};

module.exports = { create, list, getOne, voidPayment, summary, downloadReceipt };
