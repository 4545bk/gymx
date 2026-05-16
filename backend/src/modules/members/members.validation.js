/**
 * Members Validation Schemas (Zod).
 */
const { z } = require('zod');

const createMemberSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().regex(/^\+?[0-9]{9,15}$/, 'Invalid phone number format'),
  emergencyContact: z.object({
    name: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
  }).optional(),
  plan: z.object({
    type: z.enum(['3-day', 'full-week', 'weekend', 'custom']),
    allowedDays: z.array(z.number().int().min(1).max(7)).length(3).optional().nullable(),
    durationMonths: z.number().int().min(1).max(24),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  }).refine((plan) => {
    if (plan.type === '3-day') {
      return Array.isArray(plan.allowedDays) && plan.allowedDays.length === 3;
    }
    return true;
  }, { message: '3-day plan requires exactly 3 allowed days' }),
  assignedTrainerId: z.string().optional().nullable(),
  photoUrl: z.string().optional().nullable(),
  planPrice: z.number().int().min(0).optional(),
});

const updateMemberSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  phone: z.string().regex(/^\+?[0-9]{9,15}$/).optional(),
  emergencyContact: z.object({
    name: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
  }).optional(),
  assignedTrainerId: z.string().optional().nullable(),
  photoUrl: z.string().optional().nullable(),
});

const updatePlanSchema = z.object({
  type: z.enum(['3-day', 'full-week', 'weekend', 'custom']),
  allowedDays: z.array(z.number().int().min(1).max(7)).length(3).optional().nullable(),
  durationMonths: z.number().int().min(1).max(24),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  planPrice: z.number().int().min(0).optional(),
}).refine((plan) => {
  if (plan.type === '3-day') {
    return Array.isArray(plan.allowedDays) && plan.allowedDays.length === 3;
  }
  return true;
}, { message: '3-day plan requires exactly 3 allowed days' });

const updateStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'frozen']),
  reason: z.string().min(1).optional(),
}).refine((data) => {
  if (data.status === 'suspended' || data.status === 'frozen') {
    return !!data.reason;
  }
  return true;
}, { message: 'Reason is required when suspending or freezing' });

module.exports = {
  createMemberSchema,
  updateMemberSchema,
  updatePlanSchema,
  updateStatusSchema,
};
