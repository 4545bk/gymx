/**
 * Auth Controller — Request/response handling for authentication endpoints.
 */
const authService = require('./auth.service');

/**
 * POST /api/v1/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: result.refreshTokenMaxAge,
      path: '/',
    });

    res.status(200).json({
      success: true,
      data: {
        accessToken: result.accessToken,
        staff: result.staff,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/auth/refresh
 */
const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    const result = await authService.refreshAccessToken(refreshToken);

    res.status(200).json({
      success: true,
      data: {
        accessToken: result.accessToken,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    await authService.logout(req.staff.id);

    // Clear the refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    res.status(200).json({
      success: true,
      data: null,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/auth/me
 */
const me = async (req, res, next) => {
  try {
    const profile = await authService.getProfile(req.staff.id);
    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, refresh, logout, me };
