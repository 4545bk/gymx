/**
 * Ethiopian Birr (ETB) Currency Utilities — GymX
 *
 * Handles formatting and parsing of Ethiopian Birr amounts.
 * - ETB symbol: Br or ብር
 * - Uses comma as thousands separator
 * - Backend stores amounts in cents (integer)
 */

/**
 * Format an amount as Ethiopian Birr.
 *
 * @param {number} amount - Amount in the smallest unit (cents) if fromCents=true,
 *                          otherwise in whole birr.
 * @param {object} options
 * @param {'etb'|'br'|'amharic'} [options.symbol='etb'] - Currency symbol style
 *   - 'etb' → "ETB 4,500"
 *   - 'br' → "Br 4,500"
 *   - 'amharic' → "4,500 ብር"
 * @param {boolean} [options.compact=false] - Use compact notation (4.5K) for large amounts
 * @param {boolean} [options.fromCents=true] - If true, divides amount by 100 first
 * @param {boolean} [options.showSign=false] - Show +/- for positive/negative amounts
 * @returns {string}
 */
export function formatETB(amount, options = {}) {
  const {
    symbol = 'etb',
    compact = false,
    fromCents = true,
    showSign = false,
  } = options;

  if (amount == null || isNaN(amount)) return symbol === 'amharic' ? '0 ብር' : 'ETB 0';

  // Convert from cents to birr
  let value = fromCents ? amount / 100 : Number(amount);
  const isNegative = value < 0;
  const absValue = Math.abs(value);

  // Compact notation
  if (compact && absValue >= 1_000_000) {
    const formatted = (absValue / 1_000_000).toFixed(1).replace(/\.0$/, '');
    return buildCurrencyString(formatted + 'M', symbol, isNegative, showSign);
  }
  if (compact && absValue >= 1_000) {
    const formatted = (absValue / 1_000).toFixed(1).replace(/\.0$/, '');
    return buildCurrencyString(formatted + 'K', symbol, isNegative, showSign);
  }

  // Full format
  const hasCents = absValue % 1 !== 0;
  const formatted = absValue.toLocaleString('en-US', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  });

  return buildCurrencyString(formatted, symbol, isNegative, showSign);
}

/**
 * Build the final currency string with the appropriate symbol placement.
 */
function buildCurrencyString(numStr, symbol, isNegative, showSign) {
  const sign = isNegative ? '-' : (showSign ? '+' : '');

  switch (symbol) {
    case 'amharic':
      return `${sign}${numStr} ብር`;
    case 'br':
      return `${sign}Br ${numStr}`;
    case 'etb':
    default:
      return `${sign}ETB ${numStr}`;
  }
}

/**
 * Format amount for display — shortcut that always converts from cents.
 * Used across the app where backend returns cent values.
 *
 * @param {number} cents - Amount in cents
 * @param {string} lang - 'en' or 'am'
 * @returns {string}
 */
export function fmtETB(cents, lang = 'en') {
  return formatETB(cents, {
    symbol: lang === 'am' ? 'amharic' : 'etb',
    fromCents: true,
  });
}

/**
 * Format amount in compact notation — for stat cards and summaries.
 *
 * @param {number} cents - Amount in cents
 * @param {string} lang - 'en' or 'am'
 * @returns {string}
 */
export function fmtETBCompact(cents, lang = 'en') {
  return formatETB(cents, {
    symbol: lang === 'am' ? 'amharic' : 'etb',
    fromCents: true,
    compact: true,
  });
}

/**
 * Parse a user-input currency string to a number (in birr).
 * Handles: "4,500", "4500", "4.500", "ETB 4,500", "Br 4,500", "4,500 ብር"
 *
 * @param {string} str - Input string
 * @returns {number|null} - Parsed number in birr, or null if invalid
 */
export function parseETB(str) {
  if (!str || typeof str !== 'string') return null;

  // Remove currency symbols and whitespace
  let cleaned = str
    .replace(/ETB/gi, '')
    .replace(/Br/gi, '')
    .replace(/ብር/g, '')
    .trim();

  // Handle negative
  const isNeg = cleaned.startsWith('-');
  if (isNeg) cleaned = cleaned.slice(1).trim();

  // If input uses periods as thousands separator (European style): 4.500 → 4500
  // But if there's a period followed by exactly 2 digits at end, it's decimal: 45.50
  if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    // Period as thousands separator
    cleaned = cleaned.replace(/\./g, '');
  }

  // Remove commas (thousands separator)
  cleaned = cleaned.replace(/,/g, '');

  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;

  return isNeg ? -num : num;
}

/**
 * Convert birr to cents (integer) for API submission.
 * @param {number} birr
 * @returns {number}
 */
export function birrToCents(birr) {
  return Math.round(birr * 100);
}

/**
 * Convert cents to birr.
 * @param {number} cents
 * @returns {number}
 */
export function centsToBirr(cents) {
  return (cents || 0) / 100;
}
