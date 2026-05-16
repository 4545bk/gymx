const inventoryService = require('./inventory.service');

const create = async (req, res, next) => {
  try {
    const item = await inventoryService.createItem(req.body, req.staff.id);
    res.status(201).json({ success: true, data: item });
  } catch (err) { next(err); }
};

const list = async (req, res, next) => {
  try {
    const result = await inventoryService.listItems(req.query);
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};

const getOne = async (req, res, next) => {
  try {
    const item = await inventoryService.getItemById(req.params.itemId);
    res.status(200).json({ success: true, data: item });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const item = await inventoryService.updateItem(req.params.itemId, req.body);
    res.status(200).json({ success: true, data: item });
  } catch (err) { next(err); }
};

const logMaintenance = async (req, res, next) => {
  try {
    const result = await inventoryService.logMaintenance(
      req.params.itemId, req.body.serviceDate, req.body.notes
    );
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

const retire = async (req, res, next) => {
  try {
    const result = await inventoryService.retireItem(req.params.itemId);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

module.exports = { create, list, getOne, update, logMaintenance, retire };
