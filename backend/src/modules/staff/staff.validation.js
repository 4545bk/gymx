/**
 * Staff Validation Schemas (Zod).
 */
const { z } = require('zod');

const createStaffSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  role: z.enum(['owner', 'receptionist', 'trainer']),
  password: z.string().min(8).max(128),
  salary: z.object({
    amount: z.number().int().min(0).optional(),
    currency: z.string().optional(),
    paymentDay: z.number().int().min(1).max(31).optional(),
  }).optional(),
  trainerProfile: z.object({
    specialization: z.string().optional().nullable(),
    schedule: z.object({
      mon: z.boolean().optional(),
      tue: z.boolean().optional(),
      wed: z.boolean().optional(),
      thu: z.boolean().optional(),
      fri: z.boolean().optional(),
      sat: z.boolean().optional(),
      sun: z.boolean().optional(),
    }).optional(),
  }).optional().nullable(),
});

const updateStaffSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  phone: z.string().optional().nullable(),
  salary: z.object({
    amount: z.number().int().min(0).optional(),
    currency: z.string().optional(),
    paymentDay: z.number().int().min(1).max(31).optional(),
  }).optional(),
  trainerProfile: z.object({
    specialization: z.string().optional().nullable(),
    schedule: z.object({
      mon: z.boolean().optional(),
      tue: z.boolean().optional(),
      wed: z.boolean().optional(),
      thu: z.boolean().optional(),
      fri: z.boolean().optional(),
      sat: z.boolean().optional(),
      sun: z.boolean().optional(),
    }).optional(),
  }).optional().nullable(),
});

const updateStatusSchema = z.object({
  status: z.enum(['active', 'inactive']),
});

module.exports = { createStaffSchema, updateStaffSchema, updateStatusSchema };
