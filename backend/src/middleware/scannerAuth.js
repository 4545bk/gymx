/**
 * Scanner API Key Authentication Middleware.
 * Validates x-scanner-key header against SCANNER_API_KEY env var.
 * Uses crypto.timingSafeEqual to prevent timing attacks.
 * This middleware runs ONLY on the check-in endpoint — no JWT here.
 */
const crypto = require('crypto');
const { SCANNER_API_KEY } = require('../config/env');

const scannerAuth = (req, res, next) => {
  const scannerKey = req.headers['x-scanner-key'];

  if (!scannerKey) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_SCANNER_KEY',
        message: 'Scanner API key is required',
      },
    });
  }

  // Constant-time comparison to prevent timing attacks
  const keyBuffer = Buffer.from(scannerKey);
  const secretBuffer = Buffer.from(SCANNER_API_KEY);

  if (keyBuffer.length !== secretBuffer.length ||
      !crypto.timingSafeEqual(keyBuffer, secretBuffer)) {
    // Log the attempt IP for security monitoring
    console.warn(`⚠️  Invalid scanner key attempt from IP: ${req.ip}`);
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_SCANNER_KEY',
        message: 'Invalid scanner API key',
      },
    });
  }

  next();
};

module.exports = scannerAuth;
