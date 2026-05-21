/**
 * Branch Routes — Owner-only CRUD for multi-location support.
 * All routes require authentication + owner role.
 * GET /branches/count is accessible by any authenticated staff.
 */
const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const controller = require('./branches.controller');

// Middleware to restrict to owner role
const ownerOnly = (req, res, next) => {
  if (req.staff.role !== 'owner') {
    return res.status(403).json({ success: false, error: { message: 'Owner access required' } });
  }
  next();
};

// Count is available to all authenticated staff (frontend uses it to decide if branch switcher shows)
router.get('/count', auth, controller.count);

// All other routes are owner-only
router.get('/', auth, ownerOnly, controller.list);
router.post('/', auth, ownerOnly, controller.create);
router.put('/:id', auth, ownerOnly, controller.update);
router.post('/:id/regenerate-key', auth, ownerOnly, controller.regenerateKey);

module.exports = router;
