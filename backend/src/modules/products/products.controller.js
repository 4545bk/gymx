/**
 * Products Controller — Request/response handling.
 */
const productsService = require('./products.service');

const create = async (req, res, next) => {
  try {
    const product = await productsService.createProduct(req.body, req.staff.id, req.staff.fullName);
    res.status(201).json({ success: true, data: product });
  } catch (err) { next(err); }
};

const list = async (req, res, next) => {
  try {
    const result = await productsService.listProducts(req.query);
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};

const getOne = async (req, res, next) => {
  try {
    const product = await productsService.getProduct(req.params.id);
    res.status(200).json({ success: true, data: product });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const product = await productsService.updateProduct(req.params.id, req.body, req.staff.id, req.staff.fullName);
    res.status(200).json({ success: true, data: product });
  } catch (err) { next(err); }
};

const adjustStock = async (req, res, next) => {
  try {
    const result = await productsService.adjustStock(req.params.id, req.body, req.staff.id, req.staff.fullName);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

const archive = async (req, res, next) => {
  try {
    const product = await productsService.archiveProduct(req.params.id, req.staff.id, req.staff.fullName);
    res.status(200).json({ success: true, data: product });
  } catch (err) { next(err); }
};

const getMovements = async (req, res, next) => {
  try {
    const result = await productsService.getMovements(req.params.id, req.query);
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};

const getAllMovements = async (req, res, next) => {
  try {
    const result = await productsService.getMovements(null, req.query);
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};

const getLowStock = async (req, res, next) => {
  try {
    const products = await productsService.getLowStockProducts();
    res.status(200).json({ success: true, data: products });
  } catch (err) { next(err); }
};

module.exports = { create, list, getOne, update, adjustStock, archive, getMovements, getAllMovements, getLowStock };
