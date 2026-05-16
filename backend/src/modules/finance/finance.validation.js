/**
 * Finance Validation Schemas (Zod).
 */
const { z } = require('zod');

const createPaymentSchema = z.object({
  type: z.enum(['membership', 'expense', 'salary', 'other']),
  direction: z.enum(['in', 'out']),
  memberRef: z.string().optional().nullable(),
  staffRef: z.string().optional().nullable(),
  expenseCategory: z.enum(['salary', 'equipment', 'utilities', 'other']).optional().nullable(),
  amount: z.number().int().min(1, 'Amount must be positive'),
  currency: z.string().default('ETB'),
  paymentMethod: z.enum(['cash', 'bank-transfer', 'other']),
  description: z.string().min(1).max(500),
  period: z.object({
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2020).max(2100),
  }),
});

module.exports = { createPaymentSchema };
