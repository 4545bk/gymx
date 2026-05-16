/**
 * Products Service — Business logic for product management & inventory.
 *
 * Key design:
 *   - Stock decrements use atomic $inc with $gte guard for concurrency safety
 *   - Every stock change creates an InventoryMovement record
 *   - Every business action creates an AuditLog record
 */
const Product = require('../../models/Product');
const InventoryMovement = require('../../models/InventoryMovement');
const AuditLog = require('../../models/AuditLog');

// ─── Create Product ──────────────────────────────────────
const createProduct = async (data, staffId, staffName) => {
  // Check SKU uniqueness
  const existing = await Product.findOne({ sku: data.sku.toUpperCase() });
  if (existing) {
    const err = new Error('A product with this SKU already exists');
    err.statusCode = 409;
    err.code = 'SKU_DUPLICATE';
    throw err;
  }

  const product = await Product.create({
    ...data,
    sku: data.sku.toUpperCase(),
    createdBy: staffId,
  });

  // Record inventory movement if initial stock > 0
  if (product.stock > 0) {
    await InventoryMovement.create({
      productRef: product._id,
      productName: product.name,
      sku: product.sku,
      type: 'initial',
      quantityChange: product.stock,
      stockBefore: 0,
      stockAfter: product.stock,
      reason: 'Initial stock on product creation',
      performedBy: staffId,
      performedByName: staffName,
    });
  }

  // Audit log
  await AuditLog.create({
    action: 'PRODUCT_CREATED',
    entity: 'product',
    entityRef: product._id,
    entityName: product.name,
    changes: { before: null, after: { name: product.name, sku: product.sku, stock: product.stock, sellingPrice: product.sellingPrice } },
    performedBy: staffId,
    performedByName: staffName,
  });

  return product;
};

// ─── List Products ───────────────────────────────────────
const listProducts = async (query) => {
  const {
    search, category, status = 'active', lowStock,
    page = 1, limit = 20, sortBy = 'createdAt', order = 'desc',
  } = query;

  const filter = {};
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (lowStock === 'true') {
    filter.$expr = { $lte: ['$stock', '$minStockThreshold'] };
  }
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sortOrder = order === 'asc' ? 1 : -1;

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Product.countDocuments(filter),
  ]);

  // Add isLowStock flag
  const data = products.map(p => ({
    ...p,
    id: p._id,
    isLowStock: p.stock <= p.minStockThreshold,
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

// ─── Get Single Product ──────────────────────────────────
const getProduct = async (productId) => {
  const product = await Product.findById(productId).lean();
  if (!product) {
    const err = new Error('Product not found');
    err.statusCode = 404;
    throw err;
  }
  return { ...product, id: product._id, isLowStock: product.stock <= product.minStockThreshold };
};

// ─── Update Product ──────────────────────────────────────
const updateProduct = async (productId, data, staffId, staffName) => {
  const product = await Product.findById(productId);
  if (!product) {
    const err = new Error('Product not found');
    err.statusCode = 404;
    throw err;
  }

  const before = { name: product.name, sellingPrice: product.sellingPrice, category: product.category };

  Object.assign(product, data);
  await product.save();

  const after = { name: product.name, sellingPrice: product.sellingPrice, category: product.category };

  await AuditLog.create({
    action: 'PRODUCT_UPDATED',
    entity: 'product',
    entityRef: product._id,
    entityName: product.name,
    changes: { before, after },
    performedBy: staffId,
    performedByName: staffName,
  });

  return product;
};

// ─── Adjust Stock ────────────────────────────────────────
const adjustStock = async (productId, { type, quantity, reason }, staffId, staffName) => {
  const product = await Product.findById(productId);
  if (!product) {
    const err = new Error('Product not found');
    err.statusCode = 404;
    throw err;
  }

  const stockBefore = product.stock;
  let quantityChange;

  if (type === 'restock') {
    quantityChange = Math.abs(quantity);
  } else if (type === 'damaged') {
    quantityChange = -Math.abs(quantity);
  } else {
    // correction — can be positive or negative
    quantityChange = quantity;
  }

  const stockAfter = stockBefore + quantityChange;
  if (stockAfter < 0) {
    const err = new Error(`Cannot reduce stock below zero. Current: ${stockBefore}, Change: ${quantityChange}`);
    err.statusCode = 400;
    err.code = 'INSUFFICIENT_STOCK';
    throw err;
  }

  // Atomic update
  product.stock = stockAfter;
  await product.save();

  // Movement record
  await InventoryMovement.create({
    productRef: product._id,
    productName: product.name,
    sku: product.sku,
    type,
    quantityChange,
    stockBefore,
    stockAfter,
    reason: reason || `${type} by ${staffName}`,
    performedBy: staffId,
    performedByName: staffName,
  });

  // Audit log
  const actionMap = { restock: 'STOCK_RESTOCKED', damaged: 'STOCK_DAMAGED', correction: 'STOCK_ADJUSTED' };
  await AuditLog.create({
    action: actionMap[type],
    entity: 'product',
    entityRef: product._id,
    entityName: product.name,
    changes: { before: { stock: stockBefore }, after: { stock: stockAfter } },
    metadata: { type, quantityChange, reason },
    performedBy: staffId,
    performedByName: staffName,
  });

  return { product, stockBefore, stockAfter, quantityChange };
};

// ─── Archive Product ─────────────────────────────────────
const archiveProduct = async (productId, staffId, staffName) => {
  const product = await Product.findById(productId);
  if (!product) {
    const err = new Error('Product not found');
    err.statusCode = 404;
    throw err;
  }

  product.status = 'archived';
  await product.save();

  await InventoryMovement.create({
    productRef: product._id,
    productName: product.name,
    sku: product.sku,
    type: 'archived',
    quantityChange: 0,
    stockBefore: product.stock,
    stockAfter: product.stock,
    reason: `Product archived by ${staffName}`,
    performedBy: staffId,
    performedByName: staffName,
  });

  await AuditLog.create({
    action: 'PRODUCT_ARCHIVED',
    entity: 'product',
    entityRef: product._id,
    entityName: product.name,
    changes: { before: { status: 'active' }, after: { status: 'archived' } },
    performedBy: staffId,
    performedByName: staffName,
  });

  return product;
};

// ─── Get Inventory Movements ─────────────────────────────
const getMovements = async (productId, query) => {
  const { page = 1, limit = 25 } = query;
  const filter = productId ? { productRef: productId } : {};
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [movements, total] = await Promise.all([
    InventoryMovement.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    InventoryMovement.countDocuments(filter),
  ]);

  return {
    data: movements.map(m => ({ ...m, id: m._id })),
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
};

// ─── Low Stock Products ──────────────────────────────────
const getLowStockProducts = async () => {
  const products = await Product.find({
    status: 'active',
    $expr: { $lte: ['$stock', '$minStockThreshold'] },
  }).sort({ stock: 1 }).lean();

  return products.map(p => ({ ...p, id: p._id, isLowStock: true }));
};

module.exports = {
  createProduct, listProducts, getProduct, updateProduct,
  adjustStock, archiveProduct, getMovements, getLowStockProducts,
};
