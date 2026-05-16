/**
 * Products Validation — Zod schemas for product endpoints.
 */
const { z } = require('zod');

const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(120),
    sku: z.string().min(1).max(30),
    category: z.enum(['supplements', 'drinks', 'accessories', 'apparel', 'equipment', 'other']),
    description: z.string().max(500).optional(),
    sellingPrice: z.number().int().min(0),     // Cents
    costPrice: z.number().int().min(0).optional(),
    stock: z.number().int().min(0).optional(),
    minStockThreshold: z.number().int().min(0).optional(),
  }),
});

const updateProductSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(120).optional(),
    category: z.enum(['supplements', 'drinks', 'accessories', 'apparel', 'equipment', 'other']).optional(),
    description: z.string().max(500).optional(),
    sellingPrice: z.number().int().min(0).optional(),
    costPrice: z.number().int().min(0).optional(),
    minStockThreshold: z.number().int().min(0).optional(),
  }),
});

const adjustStockSchema = z.object({
  body: z.object({
    type: z.enum(['restock', 'correction', 'damaged']),
    quantity: z.number().int(),   // Positive for add, can be negative for correction
    reason: z.string().max(300).optional(),
  }),
});

module.exports = { createProductSchema, updateProductSchema, adjustStockSchema };
