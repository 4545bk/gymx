/**
 * Timezone-aware date helpers for Africa/Addis_Ababa (UTC+3).
 * All date logic in the system MUST use these helpers — never raw Date().
 * 
 * Critical for:
 *   - QR check-in expiry comparison (Step 7)
 *   - Duplicate check date string generation (Step 9)
 *   - Background job date comparisons
 */
const { format, addMonths, differenceInCalendarDays, startOfDay } = require('date-fns');
const { toZonedTime } = require('date-fns-tz');
const { GYM_TIMEZONE } = require('../config/env');

/**
 * Get current date/time in gym timezone.
 */
const nowLocal = () => {
  return toZonedTime(new Date(), GYM_TIMEZONE);
};

/**
 * Get today's date as YYYY-MM-DD string in gym timezone.
 * This is the value stored in attendance.date for duplicate checking.
 */
const getTodayDateString = () => {
  return format(nowLocal(), 'yyyy-MM-dd');
};

/**
 * Get today's ISO weekday (1=Monday … 7=Sunday) in gym timezone.
 * Used for 3-day plan allowed-day validation.
 */
const getTodayWeekday = () => {
  const day = nowLocal().getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  return day === 0 ? 7 : day; // Convert to ISO: 1=Mon … 7=Sun
};

/**
 * Compute expiry date from start date + duration in months.
 * Handles month-end edge cases (e.g., Jan 31 + 1 month = Feb 28).
 */
const computeExpiryDate = (startDate, durationMonths) => {
  return addMonths(new Date(startDate), durationMonths);
};

/**
 * Get days remaining until expiry from today (gym timezone).
 * Returns negative if already expired.
 */
const getDaysUntilExpiry = (expiryDate) => {
  const today = startOfDay(nowLocal());
  const expiry = startOfDay(new Date(expiryDate));
  return differenceInCalendarDays(expiry, today);
};

/**
 * Check if a date is expired (past today in gym timezone).
 */
const isExpired = (expiryDate) => {
  return getDaysUntilExpiry(expiryDate) < 0;
};

/**
 * Get weekday name from ISO weekday number.
 */
const weekdayName = (isoDay) => {
  const names = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return names[isoDay] || 'Unknown';
};

/**
 * Find the next allowed day from an allowedDays array.
 */
const getNextAllowedDay = (allowedDays) => {
  const today = getTodayWeekday();
  // Sort and find the next day after today
  const sorted = [...allowedDays].sort((a, b) => a - b);
  const nextDay = sorted.find((d) => d > today) || sorted[0]; // Wrap to next week
  return weekdayName(nextDay);
};

module.exports = {
  nowLocal,
  getTodayDateString,
  getTodayWeekday,
  computeExpiryDate,
  getDaysUntilExpiry,
  isExpired,
  weekdayName,
  getNextAllowedDay,
};
