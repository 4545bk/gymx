/**
 * Sales Validation — Zod schemas for sale endpoints.
 */
const { z } = require('zod');

const createSaleSchema = z.object({
  body: z.object({
    items: z.array(z.object({
      productId: z.string().min(1),
      quantity: z.number().int().min(1),
    })).min(1, 'At least one item required'),
    discount: z.number().int().min(0).optional(),
    paymentMethod: z.enum(['cash', 'bank-transfer', 'other']).optional(),
    notes: z.string().max(500).optional(),
  }),
});

const voidSaleSchema = z.object({
  body: z.object({
    reason: z.string().min(1).max(300),
  }),
});

module.exports = { createSaleSchema, voidSaleSchema };
