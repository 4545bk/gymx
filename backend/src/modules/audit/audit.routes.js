/**
 * Audit Routes — Read-only access to immutable audit logs.
 * Owner only.
 */
const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const roleGuard = require('../../middleware/roleGuard');
const AuditLog = require('../../models/AuditLog');

router.use(auth);
router.use(roleGuard(['owner']));

// GET /audit — list audit logs
router.get('/', async (req, res, next) => {
  try {
    const { entity, action, page = 1, limit = 30 } = req.query;
    const filter = {};
    if (entity) filter.entity = entity;
    if (action) filter.action = action;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: logs.map(l => ({ ...l, id: l._id })),
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) { next(err); }
});

module.exports = router;
