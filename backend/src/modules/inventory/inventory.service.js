/**
 * Inventory Service — Equipment tracking with maintenance scheduling.
 */
const Inventory = require('../../models/Inventory');
const { addMonths } = require('date-fns');
const { getDaysUntilExpiry } = require('../../utils/dateHelpers');

const createItem = async (data, staffId) => {
  const item = {
    ...data,
    purchaseInfo: data.purchaseInfo || {},
    maintenance: {
      intervalMonths: data.maintenance?.intervalMonths || 6,
      lastServiceDate: data.purchaseInfo?.date ? new Date(data.purchaseInfo.date) : null,
      nextServiceDate: data.purchaseInfo?.date
        ? addMonths(new Date(data.purchaseInfo.date), data.maintenance?.intervalMonths || 6)
        : null,
      notes: null,
    },
    createdBy: staffId,
  };

  if (item.purchaseInfo.date) item.purchaseInfo.date = new Date(item.purchaseInfo.date);

  return Inventory.create(item);
};

const listItems = async (query) => {
  const { category, condition, maintenanceDueBefore, page = 1, limit = 20 } = query;
  const filter = {};

  if (category) filter.category = category;
  if (condition) filter.condition = condition;
  if (maintenanceDueBefore) {
    filter['maintenance.nextServiceDate'] = { $lte: new Date(maintenanceDueBefore) };
    filter.condition = { $ne: 'retired' };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [items, total] = await Promise.all([
    Inventory.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    Inventory.countDocuments(filter),
  ]);

  const data = items.map((i) => ({
    id: i._id,
    name: i.name,
    category: i.category,
    brand: i.brand,
    serialNumber: i.serialNumber,
    quantity: i.quantity,
    condition: i.condition,
    purchaseInfo: i.purchaseInfo,
    maintenance: {
      lastServiceDate: i.maintenance?.lastServiceDate,
      nextServiceDate: i.maintenance?.nextServiceDate,
      intervalMonths: i.maintenance?.intervalMonths,
      notes: i.maintenance?.notes,
      daysUntilService: i.maintenance?.nextServiceDate
        ? getDaysUntilExpiry(i.maintenance.nextServiceDate)
        : null,
    },
    createdAt: i.createdAt,
  }));

  return {
    data,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
};

const getItemById = async (itemId) => {
  const item = await Inventory.findById(itemId).lean();
  if (!item) {
    const err = new Error('Equipment not found');
    err.statusCode = 404;
    err.code = 'ITEM_NOT_FOUND';
    throw err;
  }
  return item;
};

const updateItem = async (itemId, data) => {
  const item = await Inventory.findByIdAndUpdate(itemId, data, { new: true, runValidators: true });
  if (!item) {
    const err = new Error('Equipment not found');
    err.statusCode = 404;
    err.code = 'ITEM_NOT_FOUND';
    throw err;
  }
  return item;
};

/**
 * Log a completed maintenance service.
 * Recomputes nextServiceDate = serviceDate + intervalMonths.
 */
const logMaintenance = async (itemId, serviceDate, notes) => {
  const item = await Inventory.findById(itemId);
  if (!item) {
    const err = new Error('Equipment not found');
    err.statusCode = 404;
    err.code = 'ITEM_NOT_FOUND';
    throw err;
  }

  const date = new Date(serviceDate);
  const intervalMonths = item.maintenance?.intervalMonths || 6;

  item.maintenance = {
    lastServiceDate: date,
    nextServiceDate: addMonths(date, intervalMonths),
    intervalMonths,
    notes: notes || item.maintenance?.notes,
  };

  // Update condition to 'good' after service
  if (item.condition === 'needs-repair') {
    item.condition = 'good';
  }

  await item.save();

  return {
    maintenance: {
      lastServiceDate: item.maintenance.lastServiceDate,
      nextServiceDate: item.maintenance.nextServiceDate,
      intervalMonths: item.maintenance.intervalMonths,
      notes: item.maintenance.notes,
    },
  };
};

/**
 * Retire equipment (soft delete — sets condition to 'retired').
 */
const retireItem = async (itemId) => {
  const item = await Inventory.findByIdAndUpdate(
    itemId, { condition: 'retired' }, { new: true }
  );
  if (!item) {
    const err = new Error('Equipment not found');
    err.statusCode = 404;
    err.code = 'ITEM_NOT_FOUND';
    throw err;
  }
  return { id: item._id, condition: 'retired' };
};

module.exports = { createItem, listItems, getItemById, updateItem, logMaintenance, retireItem };
