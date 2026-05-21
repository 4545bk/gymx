/**
 * Member Bulk Import Controller.
 *
 * Two-step import workflow:
 *   1. POST /members/import/preview  — parse file, validate, return preview
 *   2. POST /members/import/confirm  — create members from validated data
 *
 * Supported formats: .xlsx, .xls, .csv
 * Handles Ethiopian data: Amharic names (UTF-8), phone normalization, DD/MM/YYYY dates.
 */
const multer = require('multer');
const XLSX = require('xlsx');
const Member = require('../../models/Member');
const { generateMemberId } = require('../../utils/memberIdGenerator');
const { generateQRCode } = require('../../utils/qrGenerator');
const { computeExpiryDate, getDaysUntilExpiry } = require('../../utils/dateHelpers');
const { seedCache } = require('./members.service');

// ─── Multer config (memory storage, 5 MB limit) ─────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel',                                          // .xls
      'text/csv',                                                          // .csv
      'application/csv',
      'application/octet-stream',                                          // fallback
    ];
    const ext = (file.originalname || '').toLowerCase();
    if (allowed.includes(file.mimetype) || ext.endsWith('.xlsx') || ext.endsWith('.xls') || ext.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file format. Please upload .xlsx, .xls, or .csv'));
    }
  },
});

/** Middleware: single file field named "file" */
const uploadMiddleware = upload.single('file');

// ─── Column header aliases (case-insensitive matching) ───────
const COLUMN_ALIASES = {
  fullName:          ['name', 'full name', 'fullname', 'member name', 'ስም', 'ሙሉ ስም'],
  phone:             ['phone', 'mobile', 'tel', 'telephone', 'phone number', 'ስልክ', 'ስልክ ቁጥር'],
  email:             ['email', 'e-mail', 'ኢሜይል'],
  planType:          ['plan', 'membership', 'package', 'plan type', 'አገልግሎት'],
  startDate:         ['join date', 'start date', 'registered', 'joined', 'start', 'registration date', 'የጀመረበት ቀን'],
  expiryDate:        ['expiry', 'expiry date', 'expires', 'end date', 'expiration', 'የሚያልቅበት ቀን'],
  emergencyContact:  ['emergency', 'emergency contact', 'emergency phone', 'emergency name', 'የአደጋ ጊዜ'],
};

/**
 * Normalize an Ethiopian phone number to 09XXXXXXXX format.
 * Handles: +251911..., 251911..., 0911..., 911...
 * Returns null if invalid.
 */
function normalizePhone(raw) {
  if (!raw) return null;
  let phone = String(raw).replace(/[\s\-().+]/g, '').trim();

  // Remove country code prefix
  if (phone.startsWith('251') && phone.length >= 12) {
    phone = '0' + phone.slice(3);
  }
  // Add leading zero if missing (e.g. "911234567" → "0911234567")
  if (phone.length === 9 && (phone.startsWith('9') || phone.startsWith('7'))) {
    phone = '0' + phone;
  }

  // Validate: must be 10 digits starting with 09 or 07
  if (/^0[97]\d{8}$/.test(phone)) {
    return phone;
  }
  return null;
}

/**
 * Parse a date string in DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, or Excel serial number format.
 * Returns a Date object or null.
 */
function parseDate(raw) {
  if (!raw) return null;

  // Excel serial number (numeric)
  if (typeof raw === 'number') {
    try {
      const d = XLSX.SSF.parse_date_code(raw);
      return new Date(d.y, d.m - 1, d.d);
    } catch { return null; }
  }

  const str = String(raw).trim();
  if (!str) return null;

  // ISO format: YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(str)) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  // DD/MM/YYYY or DD-MM-YYYY (Ethiopian common format — day first)
  const slashMatch = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (slashMatch) {
    const [, dayOrMonth, monthOrDay, year] = slashMatch;
    const day = parseInt(dayOrMonth);
    const month = parseInt(monthOrDay);
    // If first number > 12, it must be day (DD/MM/YYYY)
    if (day > 12) {
      const d = new Date(parseInt(year), month - 1, day);
      return isNaN(d.getTime()) ? null : d;
    }
    // If second number > 12, it must be day (MM/DD/YYYY)
    if (month > 12) {
      const d = new Date(parseInt(year), day - 1, month);
      return isNaN(d.getTime()) ? null : d;
    }
    // Ambiguous — assume DD/MM/YYYY (Ethiopian convention)
    const d = new Date(parseInt(year), month - 1, day);
    return isNaN(d.getTime()) ? null : d;
  }

  // Fallback: try native parsing
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Map plan type text to our enum values.
 */
function normalizePlanType(raw) {
  if (!raw) return 'full-week';
  const lower = String(raw).toLowerCase().trim();
  if (lower.includes('3') && lower.includes('day')) return '3-day';
  if (lower.includes('3-day') || lower === '3day') return '3-day';
  if (lower.includes('weekend')) return 'weekend';
  if (lower.includes('full') || lower.includes('week') || lower.includes('monthly') || lower.includes('standard')) return 'full-week';
  return 'full-week'; // Default
}

/**
 * Auto-detect column mapping from sheet headers.
 */
function detectColumnMapping(headers) {
  const mapping = {};
  const unmapped = [];

  for (const header of headers) {
    const lowerHeader = header.toLowerCase().trim();
    let matched = false;

    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.some(alias => lowerHeader === alias || lowerHeader.includes(alias))) {
        mapping[header] = field;
        matched = true;
        break;
      }
    }

    if (!matched) {
      unmapped.push(header);
    }
  }

  return { mapping, unmapped };
}

/**
 * Validate a single row and return errors.
 */
function validateRow(row, rowIndex, mapping, existingPhones, filePhones) {
  const errors = [];
  const mapped = {};

  // Extract values using mapping
  for (const [colHeader, field] of Object.entries(mapping)) {
    mapped[field] = row[colHeader];
  }

  // Name: required, min 2 chars
  const name = mapped.fullName ? String(mapped.fullName).trim() : '';
  if (!name) {
    errors.push({ row: rowIndex, field: 'fullName', message: 'Name is required' });
  } else if (name.length < 2) {
    errors.push({ row: rowIndex, field: 'fullName', message: 'Name must be at least 2 characters' });
  }

  // Phone: required, valid Ethiopian
  const rawPhone = mapped.phone ? String(mapped.phone) : '';
  const phone = normalizePhone(rawPhone);
  if (!rawPhone.trim()) {
    errors.push({ row: rowIndex, field: 'phone', message: 'Phone number is required' });
  } else if (!phone) {
    errors.push({ row: rowIndex, field: 'phone', message: `Invalid phone number: "${rawPhone}". Expected format: 09XXXXXXXX` });
  } else {
    // Check duplicate within file
    if (filePhones.has(phone)) {
      errors.push({ row: rowIndex, field: 'phone', message: `Duplicate phone number in file: ${phone}`, type: 'duplicate' });
    } else {
      filePhones.add(phone);
    }
    // Check duplicate in database
    if (existingPhones.has(phone)) {
      errors.push({ row: rowIndex, field: 'phone', message: `Phone already exists in database: ${phone}`, type: 'duplicate' });
    }
  }

  return { mapped, phone, errors };
}

// ═══════════════════════════════════════════════════════════════
//  PREVIEW — parse file, validate, return preview + column mapping
// ═══════════════════════════════════════════════════════════════
const preview = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { message: 'No file uploaded. Please upload an .xlsx, .xls, or .csv file.' },
      });
    }

    // Parse workbook
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: false });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return res.status(400).json({
        success: false,
        error: { message: 'The uploaded file contains no sheets.' },
      });
    }

    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rawRows.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'The uploaded file contains no data rows.' },
      });
    }

    // Filter out completely empty rows
    const rows = rawRows.filter(row =>
      Object.values(row).some(v => v !== '' && v !== null && v !== undefined)
    );

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'All rows in the file are empty.' },
      });
    }

    // Detect columns
    const headers = Object.keys(rows[0]);
    const { mapping, unmapped } = detectColumnMapping(headers);

    // Get existing phones from database for duplicate detection
    const allMembers = await Member.find({}, { phone: 1 }).lean();
    const existingPhones = new Set(allMembers.map(m => m.phone));
    const filePhones = new Set();

    // Validate all rows
    const validatedRows = [];
    const allErrors = [];
    let validCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const { mapped, phone, errors } = validateRow(rows[i], i + 2, mapping, existingPhones, filePhones);

      validatedRows.push({
        _rowIndex: i + 2,
        _original: rows[i],
        _mapped: mapped,
        _phone: phone,
        _errors: errors,
      });

      if (errors.length === 0) {
        validCount++;
      } else {
        allErrors.push(...errors);
      }
    }

    // Build preview (first 5 rows)
    const previewRows = rows.slice(0, 5);

    res.json({
      success: true,
      data: {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        totalRows: rows.length,
        validRows: validCount,
        errorCount: rows.length - validCount,
        headers,
        columnMapping: mapping,
        unmappedColumns: unmapped,
        preview: previewRows,
        errors: allErrors.slice(0, 100), // Cap error details at 100
        // Send validated data for confirm step
        _validatedRows: validatedRows,
      },
    });
  } catch (err) {
    // Handle multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: { message: 'File too large. Maximum file size is 5MB.' },
      });
    }
    console.error('[IMPORT_PREVIEW]', err);
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════════
//  CONFIRM — create members from validated data
// ═══════════════════════════════════════════════════════════════
const confirm = async (req, res, next) => {
  try {
    const { columnMapping, rows } = req.body;

    if (!columnMapping || !rows || !Array.isArray(rows)) {
      return res.status(400).json({
        success: false,
        error: { message: 'columnMapping and rows are required.' },
      });
    }

    // Re-fetch existing phones for up-to-date duplicate detection
    const allMembers = await Member.find({}, { phone: 1 }).lean();
    const existingPhones = new Set(allMembers.map(m => m.phone));
    const importedPhones = new Set();

    const imported = [];
    const skipped = [];
    const errors = [];
    const staffId = req.staff.id;
    const today = new Date();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = row._rowIndex || (i + 2);

      try {
        // Extract mapped values
        const mapped = {};
        for (const [colHeader, field] of Object.entries(columnMapping)) {
          const original = row._original || row;
          mapped[field] = original[colHeader];
        }

        // Validate name
        const fullName = mapped.fullName ? String(mapped.fullName).trim() : '';
        if (!fullName || fullName.length < 2) {
          errors.push({ row: rowIndex, message: `Invalid name: "${fullName || '(empty)'}"` });
          continue;
        }

        // Validate & normalize phone
        const phone = normalizePhone(mapped.phone);
        if (!phone) {
          errors.push({ row: rowIndex, message: `Invalid phone: "${mapped.phone || '(empty)'}"` });
          continue;
        }

        // Skip duplicates
        if (existingPhones.has(phone) || importedPhones.has(phone)) {
          skipped.push({ row: rowIndex, phone, name: fullName, reason: 'Duplicate phone number' });
          continue;
        }

        // Parse dates
        const startDate = parseDate(mapped.startDate) || today;
        const expiryDate = parseDate(mapped.expiryDate);
        const planType = normalizePlanType(mapped.planType);

        // Compute expiry if not provided
        let finalExpiry;
        if (expiryDate) {
          finalExpiry = expiryDate;
        } else {
          finalExpiry = computeExpiryDate(startDate, 1); // Default: 1 month
        }

        // Determine status based on expiry
        const isExpired = getDaysUntilExpiry(finalExpiry) < 0;

        // Generate unique member ID and QR code
        const memberId = await generateMemberId();
        const qrCodeBase64 = await generateQRCode(memberId);

        // Build emergency contact
        const emergencyContact = {};
        if (mapped.emergencyContact) {
          const ecStr = String(mapped.emergencyContact).trim();
          const ecPhone = normalizePhone(ecStr);
          if (ecPhone) {
            emergencyContact.phone = ecPhone;
          } else {
            emergencyContact.name = ecStr;
          }
        }

        // Create member document
        const memberDoc = {
          memberId,
          fullName,
          phone,
          emergencyContact,
          qrCodeBase64,
          plan: {
            type: planType,
            allowedDays: planType === '3-day' ? [1, 3, 5] : null, // Default Mon/Wed/Fri
            startDate,
            expiryDate: finalExpiry,
            durationMonths: 1,
          },
          status: isExpired ? 'expired' : 'active',
          paymentStatus: 'unpaid',
          billing: {
            totalDue: 0,
            amountPaid: 0,
            remainingBalance: 0,
            lastPaymentDate: null,
            lastPaymentAmount: 0,
            paymentCount: 0,
          },
          registeredBy: staffId,
        };

        const member = await Member.create(memberDoc);
        await seedCache(member);

        importedPhones.add(phone);
        imported.push({
          row: rowIndex,
          memberId: member.memberId,
          fullName: member.fullName,
          phone: member.phone,
          status: member.status,
        });
      } catch (rowErr) {
        // Handle unique constraint violations gracefully
        if (rowErr.code === 11000) {
          skipped.push({ row: rowIndex, reason: 'Duplicate entry (phone or ID collision)' });
        } else {
          errors.push({ row: rowIndex, message: rowErr.message });
        }
      }
    }

    res.json({
      success: true,
      data: {
        imported: imported.length,
        skipped: skipped.length,
        errorCount: errors.length,
        importedMembers: imported,
        skippedRows: skipped,
        errors: errors.slice(0, 100),
      },
    });
  } catch (err) {
    console.error('[IMPORT_CONFIRM]', err);
    next(err);
  }
};

module.exports = { preview, confirm, uploadMiddleware };
