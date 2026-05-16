/**
 * Settings Validation — Zod schemas for settings endpoints.
 */
const { z } = require('zod');

const updateSettingsSchema = z.object({
  body: z.object({
    gymName: z.string().min(1).max(120).optional(),
    tagline: z.string().max(200).optional(),
    phone: z.string().max(30).optional(),
    email: z.string().max(120).optional(),
    address: z.string().max(300).optional(),
    currency: z.string().max(10).optional(),
    timezone: z.string().max(50).optional(),
    receiptFooter: z.string().max(300).optional(),
    receiptShowQR: z.boolean().optional(),
    cardShowLogo: z.boolean().optional(),
    defaultLowStockThreshold: z.number().int().min(0).optional(),
    dashboardRefreshSeconds: z.number().int().min(5).max(300).optional(),
  }),
});

const createPlanSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(80),
    slug: z.string().min(1).max(40),
    description: z.string().max(300).optional(),
    type: z.enum(['full-week', '3-day', 'weekend', 'custom']),
    durationMonths: z.number().int().min(1).max(24).optional(),
    allowedDays: z.array(z.number().int().min(1).max(7)).optional().nullable(),
    price: z.number().int().min(0),
    sortOrder: z.number().int().optional(),
  }),
});

const updatePlanSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(80).optional(),
    description: z.string().max(300).optional(),
    type: z.enum(['full-week', '3-day', 'weekend', 'custom']).optional(),
    durationMonths: z.number().int().min(1).max(24).optional(),
    allowedDays: z.array(z.number().int().min(1).max(7)).optional().nullable(),
    price: z.number().int().min(0).optional(),
    status: z.enum(['active', 'inactive']).optional(),
    sortOrder: z.number().int().optional(),
  }),
});

module.exports = { updateSettingsSchema, createPlanSchema, updatePlanSchema };
