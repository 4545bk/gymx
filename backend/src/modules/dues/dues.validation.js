/**
 * Dues Validation — Zod schemas for dues endpoints.
 */
const { z } = require('zod');

const recordDuesPaymentSchema = z.object({
  body: z.object({
    memberId: z.string().min(1),
    amount: z.number().int().min(1),        // Cents
    paymentMethod: z.enum(['cash', 'bank-transfer', 'other']).optional(),
    description: z.string().max(300).optional(),
  }),
});

const setDuesSchema = z.object({
  body: z.object({
    totalDue: z.number().int().min(0),
  }),
});

module.exports = { recordDuesPaymentSchema, setDuesSchema };
