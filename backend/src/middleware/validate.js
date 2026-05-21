/**
 * Zod Validation Middleware Factory.
 * Validates request body against a Zod schema before the request reaches the controller.
 * Also sanitizes string inputs to prevent XSS/injection.
 *
 * Usage: router.post('/route', validate(createMemberSchema), controller.create)
 */

// ─── Sanitize strings recursively ────────────────────────
function sanitize(obj) {
  if (typeof obj === 'string') {
    // Do not sanitize base64 data URIs as they contain slashes and binary payload
    if (obj.startsWith('data:')) {
      return obj;
    }
    return obj
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .trim();
  }
  if (Array.isArray(obj)) return obj.map(sanitize);
  if (obj && typeof obj === 'object') {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      cleaned[key] = sanitize(value);
    }
    return cleaned;
  }
  return obj;
}

const validate = (schema) => {
  return (req, res, next) => {
    // Sanitize before validation
    req.body = sanitize(req.body);

    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: errors.map((e) => `${e.field}: ${e.message}`).join('; '),
          details: errors,
        },
      });
    }

    // Replace req.body with the validated and parsed data
    req.body = result.data;
    next();
  };
};

module.exports = validate;
