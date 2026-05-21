/**
 * Ethiopian Calendar & Date Utilities — GymX
 *
 * Implements the Ge'ez (Ethiopian) calendar conversion using the
 * Julian Day Number (JDN) algorithm. Ethiopian epoch: 27 August 8 CE (Julian)
 * which corresponds to JDN 1724221.
 *
 * Ethiopian calendar has 13 months:
 *   - 12 months of 30 days each
 *   - 1 month (Pagume) of 5 days (6 in a leap year)
 * Ethiopian leap year: every 4 years (when ethYear % 4 === 3)
 */

const STORAGE_KEY = 'gymx_date_format'; // 'gregorian' | 'both' | 'ethiopian'

/* ═══════════════════════════════════════════════════════════
   Month Names
   ═══════════════════════════════════════════════════════════ */
const ETH_MONTHS_AM = [
  'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሳስ', 'ጥር', 'የካቲት',
  'መጋቢት', 'ሚያዚያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜን',
];

const ETH_MONTHS_EN = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
  'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume',
];

const GREG_MONTHS_AM = [
  'ጃንዋሪ', 'ፌብሩዋሪ', 'ማርች', 'ኤፕሪል', 'ሜይ', 'ጁን',
  'ጁላይ', 'ኦገስት', 'ሴፕቴምበር', 'ኦክቶበር', 'ኖቬምበር', 'ዲሴምበር',
];

const GREG_MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAYS_AM = ['እሑድ', 'ሰኞ', 'ማክሰኞ', 'ረቡዕ', 'ሐሙስ', 'ዓርብ', 'ቅዳሜ'];

/* ═══════════════════════════════════════════════════════════
   Core Conversion: Gregorian → JDN → Ethiopian
   ═══════════════════════════════════════════════════════════ */

/**
 * Convert a Gregorian date to Julian Day Number.
 * Uses the standard astronomical algorithm.
 */
function gregorianToJDN(year, month, day) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

/**
 * Convert a Julian Day Number to Ethiopian calendar date.
 * Ethiopian epoch JDN = 1724221 (27 August 8 CE Julian / 29 August 8 CE Gregorian)
 */
function jdnToEthiopian(jdn) {
  const ETHIOPIAN_EPOCH = 1724221;
  const r = ((jdn - ETHIOPIAN_EPOCH) % 1461);
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  const year = 4 * Math.floor((jdn - ETHIOPIAN_EPOCH) / 1461) +
    Math.floor(r / 365) - Math.floor(r / 1460);
  const month = Math.floor(n / 30) + 1;
  const day = (n % 30) + 1;
  return { year, month, day };
}

/**
 * Convert a Gregorian Date object to Ethiopian calendar.
 * @param {Date} date - JavaScript Date object
 * @returns {{ year: number, month: number, day: number, monthNameAm: string, monthNameEn: string }}
 */
export function toEthiopian(date) {
  if (!(date instanceof Date) || isNaN(date)) {
    return { year: 0, month: 1, day: 1, monthNameAm: '', monthNameEn: '' };
  }
  const jdn = gregorianToJDN(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate()
  );
  const { year, month, day } = jdnToEthiopian(jdn);
  return {
    year,
    month,
    day,
    monthNameAm: ETH_MONTHS_AM[month - 1] || '',
    monthNameEn: ETH_MONTHS_EN[month - 1] || '',
  };
}

/* ═══════════════════════════════════════════════════════════
   Date Display Preference
   ═══════════════════════════════════════════════════════════ */

/**
 * Get saved date display format preference.
 * @returns {'gregorian' | 'both' | 'ethiopian'}
 */
export function getDateFormat() {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'both';
  } catch {
    return 'both';
  }
}

/**
 * Save date display format preference.
 * @param {'gregorian' | 'both' | 'ethiopian'} format
 */
export function setDateFormat(format) {
  try {
    localStorage.setItem(STORAGE_KEY, format);
  } catch { /* ignore */ }
}

/* ═══════════════════════════════════════════════════════════
   Bilingual Date Formatting
   ═══════════════════════════════════════════════════════════ */

/**
 * Format a date showing both calendars based on user preference.
 * @param {Date|string} date
 * @param {string} lang - 'en' or 'am'
 * @returns {string}
 */
export function formatBilingual(date, lang = 'en') {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d)) return '';

  const format = getDateFormat();
  const eth = toEthiopian(d);
  const isAm = lang === 'am';

  const ethStr = isAm
    ? `${eth.day} ${eth.monthNameAm} ${eth.year}`
    : `${eth.day} ${eth.monthNameEn} ${eth.year}`;

  const gregMonth = isAm
    ? GREG_MONTHS_AM[d.getMonth()]
    : GREG_MONTHS_EN[d.getMonth()];
  const gregStr = `${gregMonth} ${d.getDate()}, ${d.getFullYear()}`;

  switch (format) {
    case 'ethiopian':
      return ethStr;
    case 'gregorian':
      return gregStr;
    case 'both':
    default:
      return `${ethStr} (${gregStr})`;
  }
}

/**
 * Format a date with weekday name.
 * @param {Date|string} date
 * @param {string} lang
 * @returns {string}
 */
export function formatWithWeekday(date, lang = 'en') {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d)) return '';
  const weekday = lang === 'am' ? WEEKDAYS_AM[d.getDay()] : WEEKDAYS_EN[d.getDay()];
  return `${weekday}, ${formatBilingual(d, lang)}`;
}

/* ═══════════════════════════════════════════════════════════
   Relative Time Formatting
   ═══════════════════════════════════════════════════════════ */

/**
 * Format relative time in Amharic or English.
 * @param {Date|string} date
 * @param {string} lang - 'en' or 'am'
 * @returns {string}
 */
export function formatRelative(date, lang = 'en') {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d)) return '';

  const now = Date.now();
  const diff = Math.floor((now - d.getTime()) / 1000);
  const isAm = lang === 'am';

  if (diff < 0) {
    // Future date
    const absDiff = Math.abs(diff);
    if (absDiff < 60) return isAm ? 'አሁን' : 'just now';
    if (absDiff < 3600) {
      const mins = Math.floor(absDiff / 60);
      return isAm ? `በ${mins} ደቂቃ` : `in ${mins} min`;
    }
    if (absDiff < 86400) {
      const hrs = Math.floor(absDiff / 3600);
      return isAm ? `በ${hrs} ሰዓት` : `in ${hrs}h`;
    }
    const days = Math.floor(absDiff / 86400);
    if (days === 1) return isAm ? 'ነገ' : 'tomorrow';
    return isAm ? `በ${days} ቀን` : `in ${days} days`;
  }

  // Past
  if (diff < 10) return isAm ? 'አሁን' : 'just now';
  if (diff < 60) return isAm ? `ከ${diff} ሰከንድ በፊት` : `${diff}s ago`;
  if (diff < 3600) {
    const mins = Math.floor(diff / 60);
    return isAm ? `ከ${mins} ደቂቃ በፊት` : `${mins} min ago`;
  }
  if (diff < 86400) {
    const hrs = Math.floor(diff / 3600);
    return isAm ? `ከ${hrs} ሰዓት በፊት` : `${hrs}h ago`;
  }
  if (diff < 172800) return isAm ? 'ትናንት' : 'yesterday';

  const days = Math.floor(diff / 86400);
  if (days < 30) return isAm ? `ከ${days} ቀን በፊት` : `${days} days ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return isAm ? `ከ${months} ወር በፊት` : `${months} months ago`;

  const years = Math.floor(days / 365);
  return isAm ? `ከ${years} ዓመት በፊት` : `${years} years ago`;
}

/* ═══════════════════════════════════════════════════════════
   Expiry Date Formatting with Urgency
   ═══════════════════════════════════════════════════════════ */

/**
 * Format expiry date with urgency awareness.
 * @param {Date|string} date - Expiry date
 * @param {string} lang - 'en' or 'am'
 * @returns {{ text: string, urgency: 'normal'|'warning'|'danger' }}
 */
export function formatExpiry(date, lang = 'en') {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d)) return { text: '', urgency: 'normal' };

  const isAm = lang === 'am';
  const now = new Date();
  // Normalize to start of day for accurate day counting
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const expiry = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffMs = expiry.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / 86400000);

  // Already expired
  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    if (absDays === 1) {
      return {
        text: isAm ? 'ትናንት አልቋል' : 'Expired yesterday',
        urgency: 'danger',
      };
    }
    return {
      text: isAm ? `ከ${absDays} ቀን በፊት አልቋል` : `Expired ${absDays} days ago`,
      urgency: 'danger',
    };
  }

  // Expires today
  if (diffDays === 0) {
    return {
      text: isAm ? 'ዛሬ ያልቃል' : 'Expires today',
      urgency: 'danger',
    };
  }

  // Expires tomorrow
  if (diffDays === 1) {
    return {
      text: isAm ? 'ነገ ያልቃል' : 'Expires tomorrow',
      urgency: 'warning',
    };
  }

  // Expires within a week
  if (diffDays <= 7) {
    return {
      text: isAm ? `በ${diffDays} ቀን ያልቃል` : `Expires in ${diffDays} days`,
      urgency: 'warning',
    };
  }

  // More than 7 days — show normal date
  return {
    text: formatBilingual(d, lang),
    urgency: 'normal',
  };
}

/* ═══════════════════════════════════════════════════════════
   Helper Exports
   ═══════════════════════════════════════════════════════════ */

export { ETH_MONTHS_AM, ETH_MONTHS_EN, WEEKDAYS_EN, WEEKDAYS_AM };
