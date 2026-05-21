/**
 * Check-In Routes.
 * POST /checkin              — scanner API key auth ONLY (no JWT)
 * GET  /checkin/stream       — SSE stream (JWT auth)
 * GET  /checkin/today        — today's log (JWT auth)
 * GET  /checkin/pending-count — offline-synced count today (JWT auth)
 * 
 * IMPORTANT: The check-in POST endpoint uses scannerAuth, NOT JWT auth.
 * No other middleware should run on this path to minimize latency.
 */
const express = require('express');
const router = express.Router();
const ctrl = require('./checkin.controller');
const scannerAuth = require('../../middleware/scannerAuth');
const auth = require('../../middleware/auth');
const roleGuard = require('../../middleware/roleGuard');

// Scanner endpoint — API key only, no JWT, no rate limiting
router.post('/', scannerAuth, ctrl.checkin);

// SSE stream — JWT auth required
router.get('/stream', auth, roleGuard(['owner', 'receptionist']), ctrl.stream);

// Today's log — JWT auth required
router.get('/today', auth, roleGuard(['owner', 'receptionist']), ctrl.today);

// Offline-synced check-in count for today — JWT auth required
router.get('/pending-count', auth, roleGuard(['owner', 'receptionist']), ctrl.pendingCount);

module.exports = router;
