const { z } = require('zod');

const createInventorySchema = z.object({
  name: z.string().min(1).max(200),
  category: z.enum(['Cardio', 'Strength', 'Free weights', 'Accessories', 'Other']),
  brand: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  quantity: z.number().int().min(0).default(1),
  condition: z.enum(['good', 'fair', 'needs-repair', 'retired']).default('good'),
  purchaseInfo: z.object({
    date: z.string().optional().nullable(),
    cost: z.number().int().min(0).optional(),
    currency: z.string().optional(),
    vendor: z.string().optional().nullable(),
  }).optional(),
  maintenance: z.object({
    intervalMonths: z.number().int().min(1).optional(),
  }).optional(),
});

const updateInventorySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: z.enum(['Cardio', 'Strength', 'Free weights', 'Accessories', 'Other']).optional(),
  brand: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  quantity: z.number().int().min(0).optional(),
  condition: z.enum(['good', 'fair', 'needs-repair', 'retired']).optional(),
});

const logMaintenanceSchema = z.object({
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().optional().nullable(),
});

module.exports = { createInventorySchema, updateInventorySchema, logMaintenanceSchema };
