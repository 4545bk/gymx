/**
 * Role-Based Access Control Middleware.
 * Accepts an array of allowed roles and rejects if req.staff.role is not in the list.
 * Must be used AFTER the auth middleware (which populates req.staff).
 *
 * Usage: router.get('/route', auth, roleGuard(['owner', 'receptionist']), controller)
 */
const roleGuard = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.staff || !req.staff.role) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NOT_AUTHENTICATED',
          message: 'Authentication required',
        },
      });
    }

    if (!allowedRoles.includes(req.staff.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
        },
      });
    }

    next();
  };
};

module.exports = roleGuard;
