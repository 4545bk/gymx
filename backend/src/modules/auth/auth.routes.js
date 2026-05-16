/**
 * Auth Routes.
 * POST /login   — public
 * POST /refresh — public (requires valid refresh token cookie)
 * POST /logout  — authenticated
 * GET  /me      — authenticated
 */
const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const auth = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const { loginSchema } = require('./auth.validation');
const { loginLimiter } = require('../../middleware/rateLimiter');

// Public routes
router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh);

// Protected routes
router.post('/logout', auth, authController.logout);
router.get('/me', auth, authController.me);

module.exports = router;
