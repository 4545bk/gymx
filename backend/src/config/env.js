/**
 * Environment variable validation and export.
 * The application MUST NOT start if any required variable is missing.
 */

const requiredVars = [
  'MONGODB_URI',
  'REDIS_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'SCANNER_API_KEY',
  'NEXT_PUBLIC_API_URL',
];

const missing = requiredVars.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error('──────────────────────────────────────────────────');
  console.error('FATAL: Missing required environment variables:');
  missing.forEach((key) => console.error(`  • ${key}`));
  console.error('──────────────────────────────────────────────────');
  process.exit(1);
}

// Validate minimum secret lengths
if (process.env.JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET must be at least 32 characters.');
  process.exit(1);
}
if (process.env.JWT_REFRESH_SECRET.length < 32) {
  console.error('FATAL: JWT_REFRESH_SECRET must be at least 32 characters.');
  process.exit(1);
}

module.exports = {
  MONGODB_URI: process.env.MONGODB_URI,
  REDIS_URL: process.env.REDIS_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  SCANNER_API_KEY: process.env.SCANNER_API_KEY,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  PORT: parseInt(process.env.PORT, 10) || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  GYM_TIMEZONE: process.env.GYM_TIMEZONE || 'Africa/Addis_Ababa',
};
