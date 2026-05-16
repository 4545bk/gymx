/**
 * Sales Controller — Request/response handling.
 */
const salesService = require('./sales.service');
const { generateSaleReceipt } = require('../../utils/receiptGenerator');

const create = async (req, res, next) => {
  try {
    const sale = await salesService.createSale(req.body, req.staff.id, req.staff.fullName);
    res.status(201).json({ success: true, data: sale });
  } catch (err) { next(err); }
};

const list = async (req, res, next) => {
  try {
    const result = await salesService.listSales(req.query);
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};

const getOne = async (req, res, next) => {
  try {
    const sale = await salesService.getSale(req.params.id);
    res.status(200).json({ success: true, data: sale });
  } catch (err) { next(err); }
};

const voidSale = async (req, res, next) => {
  try {
    const sale = await salesService.voidSale(req.params.id, req.body.reason, req.staff.id, req.staff.fullName);
    res.status(200).json({ success: true, data: sale });
  } catch (err) { next(err); }
};

const analytics = async (req, res, next) => {
  try {
    const result = await salesService.getSalesAnalytics(req.query);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

const downloadReceipt = async (req, res, next) => {
  try {
    const sale = await salesService.getSale(req.params.id);
    const { stream, filename } = await generateSaleReceipt(sale);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    stream.pipe(res);
  } catch (err) { next(err); }
};

module.exports = { create, list, getOne, voidSale, analytics, downloadReceipt };
