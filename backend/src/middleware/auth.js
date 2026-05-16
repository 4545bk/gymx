/**
 * JWT Authentication Middleware.
 * Extracts access token from Authorization: Bearer <token> header.
 * Decodes { staffId, role } and attaches to req.staff.
 * Used on all protected routes EXCEPT the check-in endpoint (which uses scanner auth).
 */
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'NO_TOKEN',
        message: 'Access token is required',
      },
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.staff = {
      id: decoded.staffId,
      role: decoded.role,
      fullName: decoded.fullName || 'Unknown',
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Access token has expired',
        },
      });
    }
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Access token is invalid',
      },
    });
  }
};

module.exports = auth;
