/**
 * Sales Service — POS transaction logic.
 *
 * Key design:
 *   - Stock decrements use findOneAndUpdate with $inc + $gte guard
 *     (atomic, concurrency-safe without MongoDB transactions)
 *   - If ANY item fails stock check, the entire sale is rejected
 *     (all-or-nothing validated before writes)
 *   - Sale number auto-generated: SL-YYYYMMDD-NNN
 *   - Voiding a sale restores stock and creates reversal movement records
 */
const Sale = require('../../models/Sale');
const Product = require('../../models/Product');
const InventoryMovement = require('../../models/InventoryMovement');
const AuditLog = require('../../models/AuditLog');
const { nowAddis } = require('../../utils/dateHelpers');

// ─── Generate Sale Number ────────────────────────────────
const generateSaleNumber = async () => {
  const today = nowAddis();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `SL-${dateStr}`;

  const lastSale = await Sale.findOne({ saleNumber: { $regex: `^${prefix}` } })
    .sort({ saleNumber: -1 }).lean();

  let seq = 1;
  if (lastSale) {
    const lastSeq = parseInt(lastSale.saleNumber.split('-')[2], 10);
    seq = (lastSeq || 0) + 1;
  }

  return `${prefix}-${String(seq).padStart(3, '0')}`;
};

// ─── Create Sale ─────────────────────────────────────────
const createSale = async (data, staffId, staffName) => {
  const { items: requestItems, discount = 0, paymentMethod = 'cash', notes = '' } = data;

  // 1. Validate all products exist and have stock
  const productIds = requestItems.map(i => i.productId);
  const products = await Product.find({ _id: { $in: productIds }, status: 'active' }).lean();

  if (products.length !== productIds.length) {
    const foundIds = products.map(p => p._id.toString());
    const missing = productIds.filter(id => !foundIds.includes(id));
    const err = new Error(`Products not found or inactive: ${missing.join(', ')}`);
    err.statusCode = 400;
    err.code = 'PRODUCT_NOT_FOUND';
    throw err;
  }

  // 2. Build sale items and validate stock
  const saleItems = [];
  for (const item of requestItems) {
    const product = products.find(p => p._id.toString() === item.productId);
    if (product.stock < item.quantity) {
      const err = new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`);
      err.statusCode = 400;
      err.code = 'INSUFFICIENT_STOCK';
      throw err;
    }
    saleItems.push({
      productRef: product._id,
      productName: product.name,
      sku: product.sku,
      quantity: item.quantity,
      unitPrice: product.sellingPrice,
      lineTotal: product.sellingPrice * item.quantity,
    });
  }

  const subtotal = saleItems.reduce((sum, i) => sum + i.lineTotal, 0);
  const total = subtotal - discount;

  if (total < 0) {
    const err = new Error('Discount cannot exceed subtotal');
    err.statusCode = 400;
    throw err;
  }

  // 3. Decrement stock atomically (with $gte guard)
  const stockOps = [];
  for (const item of saleItems) {
    const result = await Product.findOneAndUpdate(
      { _id: item.productRef, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity } },
      { new: true }
    );
    if (!result) {
      // Race condition: stock was depleted between check and update
      // Rollback previously decremented items
      for (const rollback of stockOps) {
        await Product.updateOne(
          { _id: rollback.productRef },
          { $inc: { stock: rollback.quantity } }
        );
      }
      const err = new Error(`Stock for ${item.productName} was updated by another transaction. Please retry.`);
      err.statusCode = 409;
      err.code = 'STOCK_CONFLICT';
      throw err;
    }
    stockOps.push({ productRef: item.productRef, quantity: item.quantity, stockAfter: result.stock });
  }

  // 4. Create sale record
  const saleNumber = await generateSaleNumber();
  const sale = await Sale.create({
    saleNumber,
    items: saleItems,
    subtotal,
    discount,
    total,
    paymentMethod,
    notes,
    soldBy: staffId,
    soldByName: staffName,
    saleDate: nowAddis(),
  });

  // 5. Create inventory movement records
  for (let i = 0; i < saleItems.length; i++) {
    const item = saleItems[i];
    const stockAfter = stockOps[i].stockAfter;
    const stockBefore = stockAfter + item.quantity;

    await InventoryMovement.create({
      productRef: item.productRef,
      productName: item.productName,
      sku: item.sku,
      type: 'sale',
      quantityChange: -item.quantity,
      stockBefore,
      stockAfter,
      reason: `Sale ${saleNumber}`,
      saleRef: sale._id,
      performedBy: staffId,
      performedByName: staffName,
    });
  }

  // 6. Audit log
  await AuditLog.create({
    action: 'SALE_COMPLETED',
    entity: 'sale',
    entityRef: sale._id,
    entityName: saleNumber,
    changes: { before: null, after: { total, itemCount: saleItems.length, paymentMethod } },
    metadata: { saleNumber, total, discount, itemCount: saleItems.length },
    performedBy: staffId,
    performedByName: staffName,
  });

  return sale;
};

// ─── List Sales ──────────────────────────────────────────
const listSales = async (query) => {
  const { page = 1, limit = 20, from, to } = query;
  const filter = {};

  if (from || to) {
    filter.saleDate = {};
    if (from) filter.saleDate.$gte = new Date(from);
    if (to) filter.saleDate.$lte = new Date(to + 'T23:59:59Z');
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [sales, total] = await Promise.all([
    Sale.find(filter).sort({ saleDate: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    Sale.countDocuments(filter),
  ]);

  return {
    data: sales.map(s => ({ ...s, id: s._id })),
    pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
  };
};

// ─── Get Single Sale ─────────────────────────────────────
const getSale = async (saleId) => {
  const sale = await Sale.findById(saleId).lean();
  if (!sale) {
    const err = new Error('Sale not found');
    err.statusCode = 404;
    throw err;
  }
  return { ...sale, id: sale._id };
};

// ─── Void Sale ───────────────────────────────────────────
const voidSale = async (saleId, reason, staffId, staffName) => {
  const sale = await Sale.findById(saleId);
  if (!sale) {
    const err = new Error('Sale not found');
    err.statusCode = 404;
    throw err;
  }
  if (sale.voided) {
    const err = new Error('Sale is already voided');
    err.statusCode = 400;
    throw err;
  }

  // 1. Restore stock for each item
  for (const item of sale.items) {
    const product = await Product.findOneAndUpdate(
      { _id: item.productRef },
      { $inc: { stock: item.quantity } },
      { new: true }
    );

    if (product) {
      await InventoryMovement.create({
        productRef: item.productRef,
        productName: item.productName,
        sku: item.sku,
        type: 'return',
        quantityChange: item.quantity,
        stockBefore: product.stock - item.quantity,
        stockAfter: product.stock,
        reason: `Void of sale ${sale.saleNumber}: ${reason}`,
        saleRef: sale._id,
        performedBy: staffId,
        performedByName: staffName,
      });
    }
  }

  // 2. Mark sale as voided
  sale.voided = true;
  sale.voidedAt = new Date();
  sale.voidedBy = staffId;
  sale.voidReason = reason;
  await sale.save();

  // 3. Audit log
  await AuditLog.create({
    action: 'SALE_VOIDED',
    entity: 'sale',
    entityRef: sale._id,
    entityName: sale.saleNumber,
    changes: { before: { voided: false }, after: { voided: true, voidReason: reason } },
    metadata: { saleNumber: sale.saleNumber, total: sale.total, reason },
    performedBy: staffId,
    performedByName: staffName,
  });

  return sale;
};

// ─── Sales Analytics ─────────────────────────────────────
const getSalesAnalytics = async (query) => {
  const { from, to } = query;
  const match = { voided: false };
  if (from || to) {
    match.saleDate = {};
    if (from) match.saleDate.$gte = new Date(from);
    if (to) match.saleDate.$lte = new Date(to + 'T23:59:59Z');
  }

  const [summary, topProducts, dailySales] = await Promise.all([
    // Total summary
    Sale.aggregate([
      { $match: match },
      { $group: {
        _id: null,
        totalRevenue: { $sum: '$total' },
        totalSales: { $sum: 1 },
        totalDiscount: { $sum: '$discount' },
        avgSaleValue: { $avg: '$total' },
      }},
    ]),

    // Top selling products
    Sale.aggregate([
      { $match: match },
      { $unwind: '$items' },
      { $group: {
        _id: '$items.productRef',
        productName: { $first: '$items.productName' },
        totalQuantity: { $sum: '$items.quantity' },
        totalRevenue: { $sum: '$items.lineTotal' },
      }},
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
    ]),

    // Daily sales (last 30 days)
    Sale.aggregate([
      { $match: { ...match, saleDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$saleDate' } },
        revenue: { $sum: '$total' },
        count: { $sum: 1 },
      }},
      { $sort: { _id: 1 } },
    ]),
  ]);

  return {
    summary: summary[0] || { totalRevenue: 0, totalSales: 0, totalDiscount: 0, avgSaleValue: 0 },
    topProducts,
    dailySales,
  };
};

module.exports = { createSale, listSales, getSale, voidSale, getSalesAnalytics };
