/**
 * Auth Service — Business logic for authentication.
 * Handles JWT signing, bcrypt hashing, refresh token management.
 */
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Staff = require('../../models/Staff');
const { JWT_SECRET, JWT_REFRESH_SECRET } = require('../../config/env');

const SALT_ROUNDS = 12;
const REFRESH_SALT_ROUNDS = 10;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

/**
 * Authenticate staff with email and password.
 * Returns { staff, accessToken, refreshToken } on success.
 */
const login = async (email, password) => {
  // Normalize email to lowercase
  const normalizedEmail = email.toLowerCase().trim();

  // Find staff with hidden fields explicitly selected
  const staff = await Staff.findOne({ email: normalizedEmail })
    .select('+passwordHash +refreshTokenHash');

  if (!staff) {
    const err = new Error('Invalid credentials');
    err.statusCode = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  // Check account status BEFORE bcrypt to save CPU on inactive accounts
  if (staff.status === 'inactive') {
    const err = new Error('Account is inactive');
    err.statusCode = 403;
    err.code = 'ACCOUNT_INACTIVE';
    throw err;
  }

  // Verify password
  const isMatch = await bcrypt.compare(password, staff.passwordHash);
  if (!isMatch) {
    const err = new Error('Invalid credentials');
    err.statusCode = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  // Generate tokens
  const accessToken = jwt.sign(
    { staffId: staff._id, role: staff.role, fullName: staff.fullName },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { staffId: staff._id },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  // Hash refresh token and store in DB
  const refreshTokenHash = await bcrypt.hash(refreshToken, REFRESH_SALT_ROUNDS);
  staff.refreshTokenHash = refreshTokenHash;
  staff.lastLoginAt = new Date();
  await staff.save();

  return {
    staff: {
      id: staff._id,
      fullName: staff.fullName,
      role: staff.role,
      email: staff.email,
    },
    accessToken,
    refreshToken,
    refreshTokenMaxAge: REFRESH_TOKEN_MAX_AGE_MS,
  };
};

/**
 * Refresh access token using a valid refresh token.
 */
const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    const err = new Error('Refresh token required');
    err.statusCode = 401;
    err.code = 'REFRESH_TOKEN_INVALID';
    throw err;
  }

  // Verify JWT signature
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
  } catch (jwtErr) {
    const err = new Error('Refresh token expired or invalid');
    err.statusCode = 401;
    err.code = 'REFRESH_TOKEN_EXPIRED';
    throw err;
  }

  // Find staff and validate stored hash
  const staff = await Staff.findById(decoded.staffId)
    .select('+refreshTokenHash');

  if (!staff || !staff.refreshTokenHash) {
    const err = new Error('Refresh token invalidated');
    err.statusCode = 401;
    err.code = 'REFRESH_TOKEN_INVALID';
    throw err;
  }

  const isMatch = await bcrypt.compare(refreshToken, staff.refreshTokenHash);
  if (!isMatch) {
    const err = new Error('Refresh token invalidated');
    err.statusCode = 401;
    err.code = 'REFRESH_TOKEN_INVALID';
    throw err;
  }

  // Issue new access token
  const accessToken = jwt.sign(
    { staffId: staff._id, role: staff.role, fullName: staff.fullName },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  return { accessToken };
};

/**
 * Logout — invalidate refresh token.
 */
const logout = async (staffId) => {
  await Staff.findByIdAndUpdate(staffId, {
    refreshTokenHash: null,
  });
};

/**
 * Get current staff profile.
 */
const getProfile = async (staffId) => {
  const staff = await Staff.findById(staffId);
  if (!staff) {
    const err = new Error('Staff not found');
    err.statusCode = 404;
    err.code = 'STAFF_NOT_FOUND';
    throw err;
  }
  return {
    id: staff._id,
    fullName: staff.fullName,
    role: staff.role,
    email: staff.email,
    phone: staff.phone,
    trainerProfile: staff.trainerProfile,
    lastLoginAt: staff.lastLoginAt,
  };
};

/**
 * Hash a plain-text password for storage.
 */
const hashPassword = async (password) => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

module.exports = {
  login,
  refreshAccessToken,
  logout,
  getProfile,
  hashPassword,
};
