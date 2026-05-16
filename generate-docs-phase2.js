const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  LevelFormat, PageNumber, Header, Footer, TabStopType, TabStopPosition,
  PageBreak
} = require('docx');
const fs = require('fs');

// ─── COLORS ──────────────────────────────────────────────────────────────────
const C = {
  primary:    '1A3C5E',
  accent:     '2E86C1',
  lightBlue:  'D6EAF8',
  midBlue:    'AED6F1',
  darkText:   '1C2833',
  grayText:   '5D6D7E',
  lightGray:  'F2F3F4',
  midGray:    'D5D8DC',
  white:      'FFFFFF',
  green:      '1E8449',
  lightGreen: 'D5F5E3',
  amber:      'B7770D',
  lightAmber: 'FEF9E7',
  danger:     'C0392B',
  lightRed:   'FADBD8',
  purple:     '6C3483',
  lightPurple:'E8DAEF',
  teal:       '148F77',
  lightTeal:  'D1F2EB',
};

// ─── BORDERS ─────────────────────────────────────────────────────────────────
const cellBorder = (color = C.midGray) => ({
  top:    { style: BorderStyle.SINGLE, size: 1, color },
  bottom: { style: BorderStyle.SINGLE, size: 1, color },
  left:   { style: BorderStyle.SINGLE, size: 1, color },
  right:  { style: BorderStyle.SINGLE, size: 1, color },
});

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const sp = (before = 0, after = 0) => ({ spacing: { before, after } });

const h1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  children: [new TextRun({ text, bold: true, font: 'Arial', color: C.white })],
  shading: { fill: C.primary, type: ShadingType.CLEAR },
  ...sp(360, 120),
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.accent, space: 1 } },
  indent: { left: 240, right: 240 },
});

const h2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  children: [new TextRun({ text, bold: true, font: 'Arial', color: C.primary })],
  ...sp(280, 80),
  border: { bottom: { style: BorderStyle.SINGLE, size: 3, color: C.midBlue, space: 1 } },
});

const h3 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_3,
  children: [new TextRun({ text, bold: true, font: 'Arial', color: C.accent })],
  ...sp(200, 60),
});

const h4 = (text) => new Paragraph({
  children: [new TextRun({ text, bold: true, font: 'Arial', size: 22, color: C.teal })],
  ...sp(160, 40),
});

const body = (text) => new Paragraph({
  children: [new TextRun({ text, font: 'Arial', size: 22, color: C.darkText })],
  ...sp(60, 60),
});

const bullet = (text, boldPart = '') => {
  const runs = boldPart
    ? [new TextRun({ text: boldPart, bold: true, font: 'Arial', size: 22, color: C.darkText }),
       new TextRun({ text, font: 'Arial', size: 22, color: C.darkText })]
    : [new TextRun({ text, font: 'Arial', size: 22, color: C.darkText })];
  return new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: runs, ...sp(40, 40) });
};

const subBullet = (text, boldPart = '') => {
  const runs = boldPart
    ? [new TextRun({ text: boldPart, bold: true, font: 'Arial', size: 20, color: C.grayText }),
       new TextRun({ text, font: 'Arial', size: 20, color: C.grayText })]
    : [new TextRun({ text, font: 'Arial', size: 20, color: C.grayText })];
  return new Paragraph({ numbering: { reference: 'sub-bullets', level: 0 }, children: runs, ...sp(24, 24) });
};

const divider = () => new Paragraph({
  children: [],
  border: { bottom: { style: BorderStyle.SINGLE, size: 3, color: C.midGray, space: 1 } },
  ...sp(120, 120),
});

const spacer = (size = 120) => new Paragraph({ children: [new TextRun('')], ...sp(0, size) });

const code = (text) => new Paragraph({
  children: [new TextRun({ text, font: 'Courier New', size: 18, color: C.primary })],
  shading: { fill: C.lightGray, type: ShadingType.CLEAR },
  border: { left: { style: BorderStyle.SINGLE, size: 12, color: C.accent, space: 6 } },
  ...sp(40, 40),
  indent: { left: 360, right: 360 },
});

const infoBox = (lines, fill = C.lightBlue, borderColor = C.accent) =>
  lines.map((line, i) => new Paragraph({
    children: [new TextRun({ text: line, font: 'Arial', size: 20, color: C.darkText, bold: i === 0 && line !== '' })],
    shading: { fill, type: ShadingType.CLEAR },
    border: { left: { style: BorderStyle.SINGLE, size: 16, color: borderColor, space: 8 } },
    ...sp(i === 0 ? 40 : 0, i === lines.length - 1 ? 40 : 0),
    indent: { left: 360, right: 360 },
  }));

// ─── TABLE HELPERS ────────────────────────────────────────────────────────────
const cell = (text, opts = {}) => new TableCell({
  borders: cellBorder(opts.borderColor || C.midGray),
  shading: { fill: opts.fill || C.white, type: ShadingType.CLEAR },
  margins: { top: 80, bottom: 80, left: 120, right: 120 },
  width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
  children: [new Paragraph({
    children: [new TextRun({ text, font: 'Arial', size: opts.size || 20, bold: opts.bold || false, color: opts.color || C.darkText })],
    alignment: opts.align || AlignmentType.LEFT,
  })],
});

const cellLines = (lines, opts = {}) => new TableCell({
  borders: cellBorder(opts.borderColor || C.midGray),
  shading: { fill: opts.fill || C.white, type: ShadingType.CLEAR },
  margins: { top: 80, bottom: 80, left: 120, right: 120 },
  width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
  children: lines.map(line => new Paragraph({
    children: [new TextRun({ text: line, font: 'Arial', size: opts.size || 20, color: opts.color || C.darkText })],
  })),
});

const headerCell = (text, width) => cell(text, { fill: C.primary, bold: true, color: C.white, size: 20, width, borderColor: C.primary });
const subHeaderCell = (text, width) => cell(text, { fill: C.accent, bold: true, color: C.white, size: 19, width, borderColor: C.accent });

// ─── FLOW STEP ────────────────────────────────────────────────────────────────
const flowStep = (num, title, description, fill = C.lightBlue, borderColor = C.accent) =>
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [640, 8720],
    rows: [new TableRow({ children: [
      new TableCell({
        borders: cellBorder(borderColor),
        shading: { fill: borderColor, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        width: { size: 640, type: WidthType.DXA },
        children: [new Paragraph({
          children: [new TextRun({ text: num, font: 'Arial', size: 22, bold: true, color: C.white })],
          alignment: AlignmentType.CENTER,
        })],
      }),
      new TableCell({
        borders: cellBorder(borderColor),
        shading: { fill, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 200, right: 120 },
        width: { size: 8720, type: WidthType.DXA },
        children: [
          new Paragraph({ children: [new TextRun({ text: title, font: 'Arial', size: 22, bold: true, color: C.darkText })] }),
          new Paragraph({ children: [new TextRun({ text: description, font: 'Arial', size: 20, color: C.grayText })], ...sp(40, 0) }),
        ],
      }),
    ]})],
  });

const stepSpacer = () => new Paragraph({ children: [], ...sp(0, 60) });

// ─── DECISION ROW ─────────────────────────────────────────────────────────────
const decisionRow = (condition, pass, fail, widths = [3200, 3080, 3080]) =>
  new TableRow({ children: [
    cell(condition, { width: widths[0], fill: C.lightGray }),
    cell(pass, { width: widths[1], fill: C.lightGreen, color: C.green }),
    cell(fail, { width: widths[2], fill: C.lightRed, color: C.danger }),
  ]});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: MongoDB Database Design
// ═══════════════════════════════════════════════════════════════════════════════
const section4 = [
  h1('4. MongoDB Database Design'),
  spacer(80),

  ...infoBox([
    'Design Principles for This Section',
    'Every schema decision below is driven by three priorities in order: (1) QR check-in speed, (2) data integrity, (3) query flexibility for reporting. When these goals conflict, check-in speed wins. The agent must implement schemas, indexes, and embedding decisions exactly as specified \u2014 deviations from the index definitions will break performance guarantees.',
  ], C.lightBlue, C.accent),
  spacer(80),

  h2('4.1 Collections Overview'),
  body('The system uses six collections. Each collection maps to one primary domain entity. There are no junction tables \u2014 relationships are expressed through document references (ObjectId or string foreign keys) or embedded subdocuments where appropriate.'),
  spacer(40),

  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1800, 1400, 6160],
    rows: [
      new TableRow({ children: [headerCell('Collection', 1800), headerCell('Approx. Size', 1400), headerCell('Primary Purpose', 6160)] }),
      new TableRow({ children: [cell('members', { width: 1800, bold: true }), cell('Up to 5,000', { width: 1400 }), cell('One document per registered gym member. The hot collection \u2014 read on every QR scan.', { width: 6160 })] }),
      new TableRow({ children: [cell('attendance', { width: 1800, bold: true }), cell('~110,000/year', { width: 1400 }), cell('One document per check-in event (granted or denied). Append-only; never updated.', { width: 6160 })] }),
      new TableRow({ children: [cell('staff', { width: 1800, bold: true }), cell('<50', { width: 1400 }), cell('One document per staff member (owner, receptionist, trainer). Stores auth credentials and role.', { width: 6160 })] }),
      new TableRow({ children: [cell('payments', { width: 1800, bold: true }), cell('Grows monthly', { width: 1400 }), cell('Immutable financial ledger. One document per income or expense entry.', { width: 6160 })] }),
      new TableRow({ children: [cell('inventory', { width: 1800, bold: true }), cell('<500', { width: 1400 }), cell('One document per equipment type (not per unit). Tracks condition and maintenance schedule.', { width: 6160 })] }),
      new TableRow({ children: [cell('alerts', { width: 1800, bold: true }), cell('Low, TTL-pruned', { width: 1400 }), cell('Internal notification queue. Documents auto-expire via TTL index. Visible to owner and receptionist only.', { width: 6160 })] }),
    ],
  }),
  spacer(100),

  // ── 4.2 MEMBERS ──
  h2('4.2 Collection: members'),
  h3('Document Structure'),

  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2400, 1600, 5360],
    rows: [
      new TableRow({ children: [headerCell('Field', 2400), headerCell('Type', 1600), headerCell('Description', 5360)] }),
      new TableRow({ children: [cell('_id', { width: 2400, bold: true }), cell('ObjectId', { width: 1600 }), cell('MongoDB default primary key. Not used for QR lookup.', { width: 5360 })] }),
      new TableRow({ children: [cell('memberId', { width: 2400, bold: true, color: C.danger }), cell('String', { width: 1600 }), cell('UNIQUE. UUID-based token in format MBR-[A-Z0-9]{8}. Encoded in QR code. Primary lookup key on check-in path.', { width: 5360, fill: C.lightRed })] }),
      new TableRow({ children: [cell('fullName', { width: 2400 }), cell('String', { width: 1600 }), cell('Full name of the member. Indexed as text for name search.', { width: 5360 })] }),
      new TableRow({ children: [cell('phone', { width: 2400 }), cell('String', { width: 1600 }), cell('UNIQUE. International format (+251...). Used for duplicate registration check.', { width: 5360 })] }),
      new TableRow({ children: [cell('photoUrl', { width: 2400 }), cell('String | null', { width: 1600 }), cell('Optional. URL to photo stored in object storage (e.g., S3-compatible bucket).', { width: 5360 })] }),
      new TableRow({ children: [cell('emergencyContact', { width: 2400 }), cell('Object', { width: 1600 }), cell('Embedded: { name: String, phone: String }. Never queried independently.', { width: 5360 })] }),
      new TableRow({ children: [cell('plan', { width: 2400 }), cell('Object', { width: 1600 }), cell('Embedded plan object. See plan subfields table below.', { width: 5360 })] }),
      new TableRow({ children: [cell('status', { width: 2400 }), cell('String (enum)', { width: 1600 }), cell('Values: "active" | "expired" | "suspended" | "frozen". Indexed with expiryDate.', { width: 5360 })] }),
      new TableRow({ children: [cell('paymentSummary', { width: 2400 }), cell('Object', { width: 1600 }), cell('Embedded denormalized summary: { lastPaidDate, lastPaidAmount, outstandingBalance }. Updated whenever a payment is recorded. Avoids joins on dashboard.', { width: 5360 })] }),
      new TableRow({ children: [cell('assignedTrainerId', { width: 2400 }), cell('ObjectId | null', { width: 1600 }), cell('Reference to staff._id. Null if no trainer assigned. Indexed for trainer dashboard queries.', { width: 5360 })] }),
      new TableRow({ children: [cell('registeredBy', { width: 2400 }), cell('ObjectId', { width: 1600 }), cell('Reference to staff._id of the receptionist who created the record.', { width: 5360 })] }),
      new TableRow({ children: [cell('createdAt', { width: 2400 }), cell('Date', { width: 1600 }), cell('Timestamp of registration. Set once, never updated.', { width: 5360 })] }),
      new TableRow({ children: [cell('updatedAt', { width: 2400 }), cell('Date', { width: 1600 }), cell('Timestamp of last modification. Updated by Mongoose timestamps option.', { width: 5360 })] }),
    ],
  }),
  spacer(60),

  h4('Plan Subfields (embedded in members.plan)'),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2400, 1600, 5360],
    rows: [
      new TableRow({ children: [subHeaderCell('Subfield', 2400), subHeaderCell('Type', 1600), subHeaderCell('Description', 5360)] }),
      new TableRow({ children: [cell('plan.type', { width: 2400 }), cell('String (enum)', { width: 1600 }), cell('Values: "3-day" | "full-week". Determines whether allowedDays is enforced.', { width: 5360 })] }),
      new TableRow({ children: [cell('plan.allowedDays', { width: 2400 }), cell('Array<Number> | null', { width: 1600 }), cell('ISO weekday integers [1=Mon \u2026 7=Sun]. Example: [1,3,5] for Mon/Wed/Fri. Must be null when type is "full-week".', { width: 5360 })] }),
      new TableRow({ children: [cell('plan.startDate', { width: 2400 }), cell('Date', { width: 1600 }), cell('First valid day of the membership period.', { width: 5360 })] }),
      new TableRow({ children: [cell('plan.expiryDate', { width: 2400 }), cell('Date', { width: 1600 }), cell('Last valid day. Computed as startDate + durationMonths. Indexed (compound with status).', { width: 5360 })] }),
      new TableRow({ children: [cell('plan.durationMonths', { width: 2400 }), cell('Number', { width: 1600 }), cell('Number of months purchased. Stored for easy renewal calculations.', { width: 5360 })] }),
    ],
  }),
  spacer(60),

  h3('Indexes: members'),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [3200, 1400, 4760],
    rows: [
      new TableRow({ children: [headerCell('Index Definition', 3200), headerCell('Options', 1400), headerCell('Justification', 4760)] }),
      new TableRow({ children: [
        cell('{ memberId: 1 }', { width: 3200, bold: true, fill: C.lightRed }),
        cell('unique: true', { width: 1400, bold: true, color: C.danger }),
        cell('PRIMARY HOT-PATH INDEX. Every QR scan resolves through this. Must be a single-field unique index for maximum lookup speed. Never remove or rename this field.', { width: 4760, fill: C.lightRed }),
      ]}),
      new TableRow({ children: [
        cell('{ phone: 1 }', { width: 3200 }),
        cell('unique: true', { width: 1400 }),
        cell('Prevents duplicate registration. Also used by receptionist for member search by phone number.', { width: 4760 }),
      ]}),
      new TableRow({ children: [
        cell('{ fullName: "text" }', { width: 3200 }),
        cell('', { width: 1400 }),
        cell('Text index for name-based search in the member list. Supports partial word matching.', { width: 4760 }),
      ]}),
      new TableRow({ children: [
        cell('{ "plan.expiryDate": 1, status: 1 }', { width: 3200 }),
        cell('compound', { width: 1400 }),
        cell('Used by expiry-alert background job and the "expiring soon" filter on the members list. Compound covers both fields in one index scan.', { width: 4760 }),
      ]}),
      new TableRow({ children: [
        cell('{ assignedTrainerId: 1, status: 1 }', { width: 3200 }),
        cell('compound', { width: 1400 }),
        cell('Trainer dashboard query: list all active members assigned to me. Without this, trainer views would require a full collection scan.', { width: 4760 }),
      ]}),
    ],
  }),
  spacer(100),

  // ── 4.3 ATTENDANCE ──
  h2('4.3 Collection: attendance'),
  ...infoBox([
    'Design Rule: attendance is append-only.',
    'No document in this collection is ever updated or deleted by application code. Every check-in event \u2014 whether granted or denied \u2014 creates a new document. This makes the collection a reliable audit trail. The unique compound index on { memberId, date } enforces the duplicate prevention rule at the database level, not just in application code.',
  ], C.lightTeal, C.teal),
  spacer(60),

  h3('Document Structure'),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2400, 1600, 5360],
    rows: [
      new TableRow({ children: [headerCell('Field', 2400), headerCell('Type', 1600), headerCell('Description', 5360)] }),
      new TableRow({ children: [cell('_id', { width: 2400 }), cell('ObjectId', { width: 1600 }), cell('MongoDB default primary key.', { width: 5360 })] }),
      new TableRow({ children: [cell('memberId', { width: 2400, bold: true }), cell('String', { width: 1600 }), cell('The QR token string (matches members.memberId). Stored as string \u2014 not ObjectId \u2014 because this is what the scanner sends and what the check-in service receives.', { width: 5360 })] }),
      new TableRow({ children: [cell('memberRef', { width: 2400 }), cell('ObjectId', { width: 1600 }), cell('Reference to members._id. Used for aggregation joins in attendance reports. Populated after the memberId string lookup.', { width: 5360 })] }),
      new TableRow({ children: [cell('checkedInAt', { width: 2400 }), cell('Date', { width: 1600 }), cell('Full UTC timestamp of the scan event. Used for time-of-day analytics and sorting.', { width: 5360 })] }),
      new TableRow({ children: [
        cell('date', { width: 2400, bold: true, color: C.danger }),
        cell('String', { width: 1600 }),
        cell('Local date string in YYYY-MM-DD format (UTC+3). CRITICAL: this is the field used for duplicate check. Storing as string avoids timezone comparison bugs. Must be derived from checkedInAt using gym timezone.', { width: 5360, fill: C.lightRed }),
      ]}),
      new TableRow({ children: [cell('status', { width: 2400 }), cell('String (enum)', { width: 1600 }), cell('Values: "granted" | "denied". All outcomes are recorded.', { width: 5360 })] }),
      new TableRow({ children: [cell('denyReason', { width: 2400 }), cell('String | null', { width: 1600 }), cell('Values: "expired" | "suspended" | "frozen" | "wrong-day" | "duplicate" | "unknown-id" | null. Null when status is "granted".', { width: 5360 })] }),
      new TableRow({ children: [cell('planSnapshot', { width: 2400 }), cell('Object', { width: 1600 }), cell('Embedded: { type, expiryDate }. Snapshot of the member\'s plan at time of scan. Preserved for audit even if plan is later changed.', { width: 5360 })] }),
    ],
  }),
  spacer(60),

  h3('Indexes: attendance'),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [3200, 1400, 4760],
    rows: [
      new TableRow({ children: [headerCell('Index Definition', 3200), headerCell('Options', 1400), headerCell('Justification', 4760)] }),
      new TableRow({ children: [
        cell('{ memberId: 1, date: 1 }', { width: 3200, bold: true, fill: C.lightRed }),
        cell('unique: true', { width: 1400, bold: true, color: C.danger }),
        cell('CRITICAL DUAL-PURPOSE INDEX. (1) Makes the duplicate check an index scan instead of a collection scan. (2) Enforces uniqueness at DB level \u2014 a duplicate insert throws error code 11000, which the service catches to detect duplicate scans. This eliminates the need for a separate check query.', { width: 4760, fill: C.lightRed }),
      ]}),
      new TableRow({ children: [
        cell('{ memberId: 1, checkedInAt: -1 }', { width: 3200 }),
        cell('', { width: 1400 }),
        cell('Member attendance history view: all visits for one member, newest first.', { width: 4760 }),
      ]}),
      new TableRow({ children: [
        cell('{ date: 1, checkedInAt: -1 }', { width: 3200 }),
        cell('', { width: 1400 }),
        cell('Daily log view: all check-ins on a given date. Used by receptionist today-view and daily reports.', { width: 4760 }),
      ]}),
      new TableRow({ children: [
        cell('{ status: 1, date: 1 }', { width: 3200 }),
        cell('', { width: 1400 }),
        cell('Denied entry analytics: filter by denial reason across a date range for reporting.', { width: 4760 }),
      ]}),
    ],
  }),
  spacer(100),

  // ── 4.4 STAFF ──
  h2('4.4 Collection: staff'),
  h3('Document Structure'),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2400, 1600, 5360],
    rows: [
      new TableRow({ children: [headerCell('Field', 2400), headerCell('Type', 1600), headerCell('Description', 5360)] }),
      new TableRow({ children: [cell('_id', { width: 2400 }), cell('ObjectId', { width: 1600 }), cell('Primary key. Referenced by members.assignedTrainerId and members.registeredBy.', { width: 5360 })] }),
      new TableRow({ children: [cell('fullName', { width: 2400 }), cell('String', { width: 1600 }), cell('Display name. Snapshot-copied into payments.recordedBy and payments.memberName at write time.', { width: 5360 })] }),
      new TableRow({ children: [cell('phone', { width: 2400 }), cell('String', { width: 1600 }), cell('Contact phone. Not used for authentication.', { width: 5360 })] }),
      new TableRow({ children: [cell('email', { width: 2400, bold: true }), cell('String', { width: 1600 }), cell('UNIQUE. Used as login credential. Lowercase-normalized on write.', { width: 5360 })] }),
      new TableRow({ children: [cell('role', { width: 2400 }), cell('String (enum)', { width: 1600 }), cell('Values: "owner" | "receptionist" | "trainer". Embedded in JWT payload at login.', { width: 5360 })] }),
      new TableRow({ children: [cell('passwordHash', { width: 2400 }), cell('String', { width: 1600 }), cell('bcrypt hash (salt rounds: 12). NEVER returned in API responses. Select: false in Mongoose schema.', { width: 5360 })] }),
      new TableRow({ children: [cell('refreshTokenHash', { width: 2400 }), cell('String | null', { width: 1600 }), cell('bcrypt hash of the current refresh token. Set on login, nulled on logout. Allows server-side token invalidation. Select: false.', { width: 5360 })] }),
      new TableRow({ children: [cell('lastLoginAt', { width: 2400 }), cell('Date | null', { width: 1600 }), cell('Timestamp of last successful login.', { width: 5360 })] }),
      new TableRow({ children: [cell('trainerProfile', { width: 2400 }), cell('Object | null', { width: 1600 }), cell('Null for owner and receptionist. Embedded for trainers: { specialization, schedule, assignedMemberCount }.', { width: 5360 })] }),
      new TableRow({ children: [cell('salary', { width: 2400 }), cell('Object', { width: 1600 }), cell('Embedded: { amount, currency, paymentDay }. Stores salary terms, not payment history. Actual payments recorded in payments collection.', { width: 5360 })] }),
      new TableRow({ children: [cell('status', { width: 2400 }), cell('String (enum)', { width: 1600 }), cell('Values: "active" | "inactive". Inactive staff cannot authenticate.', { width: 5360 })] }),
      new TableRow({ children: [cell('createdAt / updatedAt', { width: 2400 }), cell('Date', { width: 1600 }), cell('Managed by Mongoose timestamps: true.', { width: 5360 })] }),
    ],
  }),
  spacer(60),

  h3('Indexes: staff'),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [3200, 1400, 4760],
    rows: [
      new TableRow({ children: [headerCell('Index Definition', 3200), headerCell('Options', 1400), headerCell('Justification', 4760)] }),
      new TableRow({ children: [cell('{ email: 1 }', { width: 3200, bold: true }), cell('unique: true', { width: 1400 }), cell('Primary login lookup. Unique prevents duplicate accounts.', { width: 4760 })] }),
      new TableRow({ children: [cell('{ role: 1, status: 1 }', { width: 3200 }), cell('compound', { width: 1400 }), cell('"List all active trainers" is a frequent query. Compound index covers both filters.', { width: 4760 })] }),
    ],
  }),
  spacer(100),

  // ── 4.5 PAYMENTS ──
  h2('4.5 Collection: payments'),
  ...infoBox([
    'Design Rule: payments is an immutable ledger.',
    'No payment document is ever updated or hard-deleted. If a payment must be cancelled, a reversal document is inserted with the same amount and direction reversed, and the original document is marked voided: true. This preserves a complete financial audit trail.',
  ], C.lightAmber, C.amber),
  spacer(60),

  h3('Document Structure'),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2400, 1600, 5360],
    rows: [
      new TableRow({ children: [headerCell('Field', 2400), headerCell('Type', 1600), headerCell('Description', 5360)] }),
      new TableRow({ children: [cell('_id', { width: 2400 }), cell('ObjectId', { width: 1600 }), cell('Primary key.', { width: 5360 })] }),
      new TableRow({ children: [cell('type', { width: 2400 }), cell('String (enum)', { width: 1600 }), cell('Values: "membership" | "expense" | "salary" | "other".', { width: 5360 })] }),
      new TableRow({ children: [cell('direction', { width: 2400 }), cell('String (enum)', { width: 1600 }), cell('Values: "in" (income) | "out" (expense). Determines sign in P&L calculation.', { width: 5360 })] }),
      new TableRow({ children: [cell('memberRef', { width: 2400 }), cell('ObjectId | null', { width: 1600 }), cell('Reference to members._id. Null for non-membership payments.', { width: 5360 })] }),
      new TableRow({ children: [cell('memberName', { width: 2400 }), cell('String | null', { width: 1600 }), cell('SNAPSHOT of member name at write time. Preserved if member is later deleted.', { width: 5360 })] }),
      new TableRow({ children: [cell('planType', { width: 2400 }), cell('String | null', { width: 1600 }), cell('SNAPSHOT of plan type at time of payment. For membership payments only.', { width: 5360 })] }),
      new TableRow({ children: [cell('staffRef', { width: 2400 }), cell('ObjectId | null', { width: 1600 }), cell('Reference to staff._id. Used for salary payments only.', { width: 5360 })] }),
      new TableRow({ children: [cell('expenseCategory', { width: 2400 }), cell('String | null', { width: 1600 }), cell('Values: "salary" | "equipment" | "utilities" | "other". Null for income entries.', { width: 5360 })] }),
      new TableRow({ children: [cell('description', { width: 2400 }), cell('String', { width: 1600 }), cell('Free-text note. Example: "Monthly renewal \u2014 May 2026".', { width: 5360 })] }),
      new TableRow({ children: [cell('amount', { width: 2400 }), cell('Number (integer)', { width: 1600 }), cell('Amount in smallest currency unit (Ethiopian cents). 800 ETB = 80000. Integer prevents floating-point errors.', { width: 5360 })] }),
      new TableRow({ children: [cell('currency', { width: 2400 }), cell('String', { width: 1600 }), cell('ISO currency code. Default: "ETB".', { width: 5360 })] }),
      new TableRow({ children: [cell('paymentMethod', { width: 2400 }), cell('String (enum)', { width: 1600 }), cell('Values: "cash" | "bank-transfer" | "other".', { width: 5360 })] }),
      new TableRow({ children: [cell('period', { width: 2400 }), cell('Object', { width: 1600 }), cell('Embedded: { month: Number [1-12], year: Number }. Enables monthly P&L grouping without date range queries.', { width: 5360 })] }),
      new TableRow({ children: [cell('voided', { width: 2400 }), cell('Boolean', { width: 1600 }), cell('Default false. Set to true when a reversal document has been created for this entry.', { width: 5360 })] }),
      new TableRow({ children: [cell('reversalOf', { width: 2400 }), cell('ObjectId | null', { width: 1600 }), cell('If this document is a reversal, references the original payment\'s _id.', { width: 5360 })] }),
      new TableRow({ children: [cell('recordedBy', { width: 2400 }), cell('ObjectId', { width: 1600 }), cell('Reference to staff._id who created this record.', { width: 5360 })] }),
      new TableRow({ children: [cell('recordedAt', { width: 2400 }), cell('Date', { width: 1600 }), cell('Timestamp of entry creation. Set once, never updated.', { width: 5360 })] }),
    ],
  }),
  spacer(60),

  h3('Indexes: payments'),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [3200, 1400, 4760],
    rows: [
      new TableRow({ children: [headerCell('Index Definition', 3200), headerCell('Options', 1400), headerCell('Justification', 4760)] }),
      new TableRow({ children: [cell('{ memberRef: 1, recordedAt: -1 }', { width: 3200 }), cell('compound', { width: 1400 }), cell('Member payment history: all payments for one member, newest first.', { width: 4760 })] }),
      new TableRow({ children: [cell('{ "period.year": 1, "period.month": 1, direction: 1 }', { width: 3200 }), cell('compound', { width: 1400 }), cell('Monthly P&L report query. Covers the three fields most commonly combined in financial aggregations.', { width: 4760 })] }),
      new TableRow({ children: [cell('{ direction: 1, expenseCategory: 1, recordedAt: -1 }', { width: 3200 }), cell('compound', { width: 1400 }), cell('Expense breakdown by category within a date range.', { width: 4760 })] }),
    ],
  }),
  spacer(100),

  // ── 4.6 INVENTORY ──
  h2('4.6 Collection: inventory'),
  h3('Document Structure'),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2400, 1600, 5360],
    rows: [
      new TableRow({ children: [headerCell('Field', 2400), headerCell('Type', 1600), headerCell('Description', 5360)] }),
      new TableRow({ children: [cell('_id', { width: 2400 }), cell('ObjectId', { width: 1600 }), cell('Primary key.', { width: 5360 })] }),
      new TableRow({ children: [cell('name', { width: 2400 }), cell('String', { width: 1600 }), cell('Equipment name. Example: "Treadmill", "Barbell Set".', { width: 5360 })] }),
      new TableRow({ children: [cell('category', { width: 2400 }), cell('String (enum)', { width: 1600 }), cell('Values: "Cardio" | "Strength" | "Free weights" | "Accessories" | "Other".', { width: 5360 })] }),
      new TableRow({ children: [cell('brand', { width: 2400 }), cell('String', { width: 1600 }), cell('Manufacturer name.', { width: 5360 })] }),
      new TableRow({ children: [cell('serialNumber', { width: 2400 }), cell('String | null', { width: 1600 }), cell('Manufacturer serial number for individual units.', { width: 5360 })] }),
      new TableRow({ children: [cell('quantity', { width: 2400 }), cell('Number', { width: 1600 }), cell('Number of units of this equipment type in the gym.', { width: 5360 })] }),
      new TableRow({ children: [cell('condition', { width: 2400 }), cell('String (enum)', { width: 1600 }), cell('Values: "good" | "fair" | "needs-repair" | "retired". Updated manually or on maintenance log.', { width: 5360 })] }),
      new TableRow({ children: [cell('purchaseInfo', { width: 2400 }), cell('Object', { width: 1600 }), cell('Embedded: { date, cost (integer cents), currency, vendor }. Stored once; never updated.', { width: 5360 })] }),
      new TableRow({ children: [cell('maintenance', { width: 2400 }), cell('Object', { width: 1600 }), cell('Embedded: { lastServiceDate, nextServiceDate, intervalMonths, notes }. nextServiceDate recomputed on each service log.', { width: 5360 })] }),
      new TableRow({ children: [cell('createdBy', { width: 2400 }), cell('ObjectId', { width: 1600 }), cell('Reference to staff._id who added the equipment.', { width: 5360 })] }),
      new TableRow({ children: [cell('createdAt / updatedAt', { width: 2400 }), cell('Date', { width: 1600 }), cell('Managed by Mongoose timestamps: true.', { width: 5360 })] }),
    ],
  }),
  spacer(60),

  h3('Indexes: inventory'),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [3200, 1400, 4760],
    rows: [
      new TableRow({ children: [headerCell('Index Definition', 3200), headerCell('Options', 1400), headerCell('Justification', 4760)] }),
      new TableRow({ children: [cell('{ "maintenance.nextServiceDate": 1, condition: 1 }', { width: 3200 }), cell('compound', { width: 1400 }), cell('Used by the daily maintenance-alert background job. Finds all non-retired equipment with service due within 7 days.', { width: 4760 })] }),
      new TableRow({ children: [cell('{ category: 1, condition: 1 }', { width: 3200 }), cell('compound', { width: 1400 }), cell('Dashboard filter: show all Cardio equipment in "needs-repair" condition.', { width: 4760 })] }),
    ],
  }),
  spacer(100),

  // ── 4.7 ALERTS ──
  h2('4.7 Collection: alerts'),
  h3('Document Structure'),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2400, 1600, 5360],
    rows: [
      new TableRow({ children: [headerCell('Field', 2400), headerCell('Type', 1600), headerCell('Description', 5360)] }),
      new TableRow({ children: [cell('_id', { width: 2400 }), cell('ObjectId', { width: 1600 }), cell('Primary key.', { width: 5360 })] }),
      new TableRow({ children: [cell('type', { width: 2400 }), cell('String (enum)', { width: 1600 }), cell('Values: "membership-expiring" | "membership-expired" | "payment-overdue" | "maintenance-due" | "manual".', { width: 5360 })] }),
      new TableRow({ children: [cell('severity', { width: 2400 }), cell('String (enum)', { width: 1600 }), cell('Values: "info" | "warning" | "critical". Displayed with color coding in the UI.', { width: 5360 })] }),
      new TableRow({ children: [cell('subjectType', { width: 2400 }), cell('String (enum)', { width: 1600 }), cell('Values: "member" | "equipment" | "staff". Identifies the type of the subject entity.', { width: 5360 })] }),
      new TableRow({ children: [cell('subjectRef', { width: 2400 }), cell('ObjectId', { width: 1600 }), cell('Reference to the subject entity\'s _id. Combined with subjectType to form a polymorphic reference.', { width: 5360 })] }),
      new TableRow({ children: [cell('subjectName', { width: 2400 }), cell('String', { width: 1600 }), cell('Snapshot of the subject\'s display name at creation time for fast rendering without joins.', { width: 5360 })] }),
      new TableRow({ children: [cell('message', { width: 2400 }), cell('String', { width: 1600 }), cell('Human-readable description. Example: "Selam Tesfaye\'s membership expires in 3 days".', { width: 5360 })] }),
      new TableRow({ children: [cell('visibleTo', { width: 2400 }), cell('Array<String>', { width: 1600 }), cell('Roles that can see this alert. Values: ["owner"] | ["receptionist"] | ["owner","receptionist"].', { width: 5360 })] }),
      new TableRow({ children: [cell('isRead', { width: 2400 }), cell('Boolean', { width: 1600 }), cell('False until any eligible staff member marks it read.', { width: 5360 })] }),
      new TableRow({ children: [cell('readBy', { width: 2400 }), cell('Array<ObjectId>', { width: 1600 }), cell('List of staff._id values who have marked this read. Allows per-user read state if needed later.', { width: 5360 })] }),
      new TableRow({ children: [cell('createdAt', { width: 2400 }), cell('Date', { width: 1600 }), cell('Alert creation timestamp.', { width: 5360 })] }),
      new TableRow({ children: [
        cell('expiresAt', { width: 2400, bold: true, color: C.danger }),
        cell('Date', { width: 1600 }),
        cell('TTL field. MongoDB automatically deletes the document at this date. Set to createdAt + 14 days for most alerts. The TTL index on this field handles all alert cleanup \u2014 no manual deletion needed.', { width: 5360, fill: C.lightRed }),
      ]}),
    ],
  }),
  spacer(60),

  h3('Indexes: alerts'),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [3200, 1400, 4760],
    rows: [
      new TableRow({ children: [headerCell('Index Definition', 3200), headerCell('Options', 1400), headerCell('Justification', 4760)] }),
      new TableRow({ children: [
        cell('{ expiresAt: 1 }', { width: 3200, bold: true }),
        cell('expireAfterSeconds: 0', { width: 1400, bold: true, color: C.danger }),
        cell('TTL INDEX. MongoDB background thread deletes documents where expiresAt has passed. This is the sole mechanism for alert cleanup \u2014 no cron job or application code needed.', { width: 4760 }),
      ]}),
      new TableRow({ children: [cell('{ visibleTo: 1, isRead: 1, createdAt: -1 }', { width: 3200 }), cell('compound', { width: 1400 }), cell('Alert feed query: unread alerts visible to this role, newest first. This exact compound covers the most common query pattern.', { width: 4760 })] }),
    ],
  }),
  spacer(100),

  // ── 4.8 EMBEDDING VS REFERENCING ──
  h2('4.8 Embedding vs. Referencing Decisions'),
  body('These decisions are fixed. The agent must not reorganize them. Each choice has a specific performance or integrity reason.'),
  spacer(40),

  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2600, 1400, 5360],
    rows: [
      new TableRow({ children: [headerCell('Data', 2600), headerCell('Decision', 1400), headerCell('Reason', 5360)] }),
      new TableRow({ children: [
        cell('members.plan', { width: 2600 }),
        cell('EMBED', { width: 1400, bold: true, fill: C.lightGreen, color: C.green }),
        cell('Always read together with the member document. No separate query needed. Plan is not shared across members.', { width: 5360 }),
      ]}),
      new TableRow({ children: [
        cell('members.emergencyContact', { width: 2600 }),
        cell('EMBED', { width: 1400, bold: true, fill: C.lightGreen, color: C.green }),
        cell('Small, belongs to one member, never queried independently.', { width: 5360 }),
      ]}),
      new TableRow({ children: [
        cell('members.paymentSummary', { width: 2600 }),
        cell('EMBED (denormalized)', { width: 1400, bold: true, fill: C.lightAmber, color: C.amber }),
        cell('Dashboard shows "last paid / balance" without a join to payments. Updated every time a payment is recorded. This is a deliberate trade-off: slight write overhead for much faster reads.', { width: 5360 }),
      ]}),
      new TableRow({ children: [
        cell('attendance.planSnapshot', { width: 2600 }),
        cell('EMBED (snapshot)', { width: 1400, bold: true, fill: C.lightAmber, color: C.amber }),
        cell('Audit trail integrity. The attendance record must reflect what the member\'s plan was at scan time, not what it is today. A reference would be unreliable if the plan later changes.', { width: 5360 }),
      ]}),
      new TableRow({ children: [
        cell('payments.memberName, payments.planType', { width: 2600 }),
        cell('EMBED (snapshot)', { width: 1400, bold: true, fill: C.lightAmber, color: C.amber }),
        cell('A member may be deleted years later. The payment record must still be meaningful for financial auditing. Snapshots ensure data permanence.', { width: 5360 }),
      ]}),
      new TableRow({ children: [
        cell('staff.trainerProfile', { width: 2600 }),
        cell('EMBED', { width: 1400, bold: true, fill: C.lightGreen, color: C.green }),
        cell('Trainer-specific data is always read with the staff document. No other collection references trainer specialization or schedule directly.', { width: 5360 }),
      ]}),
      new TableRow({ children: [
        cell('staff.salary', { width: 2600 }),
        cell('EMBED (terms only)', { width: 1400, bold: true, fill: C.lightGreen, color: C.green }),
        cell('Salary terms (amount, currency, paymentDay) belong to the staff record. Actual salary payment events are separate documents in payments collection.', { width: 5360 }),
      ]}),
      new TableRow({ children: [
        cell('members.assignedTrainerId', { width: 2600 }),
        cell('REFERENCE', { width: 1400, bold: true, fill: C.lightBlue, color: C.primary }),
        cell('A trainer is a full document with its own lifecycle (can be deactivated, salary changed). The trainer\'s data would grow unboundedly if embedded in every member.', { width: 5360 }),
      ]}),
      new TableRow({ children: [
        cell('attendance \u2192 members', { width: 2600 }),
        cell('REFERENCE', { width: 1400, bold: true, fill: C.lightBlue, color: C.primary }),
        cell('Attendance is a time-series collection. A member generates hundreds of records over their lifetime. Embedding attendance in the member document would cause the member document to grow without bound, breaking the 16MB document limit and degrading all member queries.', { width: 5360 }),
      ]}),
      new TableRow({ children: [
        cell('payments \u2192 members', { width: 2600 }),
        cell('REFERENCE', { width: 1400, bold: true, fill: C.lightBlue, color: C.primary }),
        cell('Same reasoning as attendance. Payment history grows over years. References keep the member document small and fast.', { width: 5360 }),
      ]}),
    ],
  }),

  spacer(100),
  divider(),
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: Core System Flows
// ═══════════════════════════════════════════════════════════════════════════════
const section5 = [
  spacer(80),
  h1('5. Core System Flows'),
  spacer(80),

  body('This section defines every significant operation as a precise, ordered sequence of steps. Each flow is the authoritative specification for how the system behaves. The agent must implement each step in the order given. Steps marked CRITICAL must not be skipped, reordered, or optimized away without explicit justification.'),
  spacer(80),

  // ── 5.1 QR CHECK-IN ──
  h2('5.1 Flow: QR Check-In (Primary Flow)'),
  ...infoBox([
    'Performance Requirement: Total time from HTTP request received to response sent must be under 200ms on a cache hit. The 1-second SLA includes network round-trip from scanner to server.',
  ], C.lightRed, C.danger),
  spacer(60),

  flowStep('1', 'Scanner sends memberId to API', 'The USB QR scanner reads a QR code and types the memberId string (format: MBR-XXXXXXXX) followed by an Enter keystroke into the check-in page\'s hidden input field. The page captures the full string on Enter, clears the buffer, and immediately fires: POST /api/v1/checkin with body { memberId } and header x-scanner-key.', C.lightGreen, C.green),
  stepSpacer(),
  flowStep('2', 'Validate scanner API key', 'API key middleware extracts the x-scanner-key header. It compares the value against the SCANNER_API_KEY environment variable using crypto.timingSafeEqual(). If the comparison fails, return HTTP 401 immediately. No further processing occurs. Log the attempt with the request IP.', C.lightBlue, C.accent),
  stepSpacer(),
  flowStep('3', 'Validate memberId format', 'Apply regex validation: /^MBR-[A-Z0-9]{8}$/. If the string does not match, return HTTP 400 with error code INVALID_FORMAT. This step costs under 1ms and protects against garbage input from partial scans or mis-reads. No Redis or MongoDB is touched if this fails.', C.lightBlue, C.accent),
  stepSpacer(),
  flowStep('4', 'Redis cache lookup', 'Execute GET member:{memberId} on Redis. If a cached record is found (cache hit), parse the JSON string and proceed to Step 6. If the key does not exist (cache miss), proceed to Step 5. If Redis throws an error (connection refused, timeout), catch it silently, log the error, and proceed to Step 5 using MongoDB directly.', C.lightAmber, C.amber),
  stepSpacer(),
  flowStep('5', 'MongoDB fallback lookup (cache miss only)', 'Query members collection: findOne({ memberId }). This query hits the { memberId: 1 } unique index and returns in under 5ms. If no document is found, write a denied attendance record with denyReason "unknown-id", then return HTTP 200 with result: "denied". If found, serialize the member to the cache payload format, write to Redis with 24-hour TTL, then continue to Step 6.', C.lightAmber, C.amber),
  stepSpacer(),
  flowStep('6', 'CRITICAL: Check membership status', 'Read the status field from the member record. If status is not exactly "active", the check-in is denied. Return HTTP 200 with result: "denied" and the appropriate denyReason: "suspended", "frozen", or "expired". Write a denied attendance record with this reason. Do not proceed to expiry or day checks.', C.lightRed, C.danger),
  stepSpacer(),
  flowStep('7', 'CRITICAL: Check expiry date (timezone-aware)', 'Compute todayLocal as the current date in the gym timezone (Africa/Addis_Ababa, UTC+3). Compare: if plan.expiryDate < todayLocal, the membership has expired. Write the denied attendance record with denyReason: "expired". Additionally: (a) update the member\'s status to "expired" in MongoDB, (b) invalidate the Redis key for this member, (c) queue an alert of type "membership-expired". Then return HTTP 200 with result: "denied".', C.lightRed, C.danger),
  stepSpacer(),
  flowStep('8', 'Check allowed days (3-day plan only)', 'If plan.type is "full-week", skip this step entirely. If plan.type is "3-day", compute todayWeekday as the ISO weekday integer for todayLocal (1=Monday, 7=Sunday). Check if plan.allowedDays includes todayWeekday. If not, return HTTP 200 with result: "denied", denyReason: "wrong-day", and a message field containing the next allowed weekday name. Write the denied attendance record.', C.lightBlue, C.accent),
  stepSpacer(),
  flowStep('9', 'CRITICAL: Optimistic attendance insert (duplicate check)', 'Attempt to insert the attendance document directly without a prior query. The document includes: memberId, memberRef, checkedInAt (now UTC), date (todayLocal as YYYY-MM-DD string), status: "granted", denyReason: null, planSnapshot: { type, expiryDate }. If the insert succeeds, proceed to Step 10. If MongoDB throws a duplicate key error (error code 11000), the member has already checked in today. Return HTTP 200 with result: "denied", denyReason: "duplicate", and the original check-in time. Do NOT insert a second attendance record for duplicates.', C.lightRed, C.danger),
  stepSpacer(),
  flowStep('10', 'Post-grant expiry warning (async)', 'After the attendance insert succeeds, compute daysUntilExpiry = plan.expiryDate - todayLocal. If daysUntilExpiry <= 5, queue an alert insert of type "membership-expiring" asynchronously (using setImmediate or similar). This must NOT delay the HTTP response. The alert write happens after the response is sent.', C.lightGreen, C.green),
  stepSpacer(),
  flowStep('11', 'Emit SSE event', 'Publish the check-in result to the in-process SSE broker. All connected clients (check-in page live feed, receptionist dashboard) receive the event. This is also asynchronous and must not delay the response.', C.lightGreen, C.green),
  stepSpacer(),
  flowStep('12', 'Return granted response', 'Return HTTP 200 with: result: "granted", member.fullName, member.planType, member.expiryDate, expiringSoon (boolean, true if daysUntilExpiry <= 5), checkedInAt timestamp. The check-in page displays the green panel with the member\'s name.', C.lightGreen, C.green),
  spacer(100),

  // ── 5.2 MEMBER REGISTRATION ──
  h2('5.2 Flow: Member Registration'),
  body('Performed by owner or receptionist. Creates the member document, generates the QR code, and seeds the Redis cache.'),
  spacer(40),

  flowStep('1', 'Receive and validate request body', 'Validate all fields with Zod schema: fullName (required, string), phone (required, must match E.164 format), plan.type (enum), plan.allowedDays (required if type is "3-day", must be array of 3 unique integers in [1-7]), plan.durationMonths (required, positive integer), plan.startDate (required, ISO date string), assignedTrainerId (optional, valid ObjectId).', C.lightBlue, C.accent),
  stepSpacer(),
  flowStep('2', 'Check for duplicate phone', 'Query members: findOne({ phone }). If a record exists, return HTTP 409 with error code PHONE_ALREADY_EXISTS. Do not proceed.', C.lightBlue, C.accent),
  stepSpacer(),
  flowStep('3', 'Generate memberId', 'Generate a UUID v4, convert to uppercase, take the first 8 alphanumeric characters, prefix with "MBR-". Example: "MBR-A3F7C9D1". Check for collision against the members collection (highly unlikely but required for correctness). Regenerate if collision found.', C.lightAmber, C.amber),
  stepSpacer(),
  flowStep('4', 'Compute expiry date', 'Set expiryDate = startDate + durationMonths calendar months. Use a reliable date library (date-fns or dayjs) to handle month-end edge cases. Example: startDate=2026-01-31 + 1 month = 2026-02-28 (not 2026-03-03).', C.lightAmber, C.amber),
  stepSpacer(),
  flowStep('5', 'Generate QR code', 'Use the qrcode npm package to generate a PNG image encoding only the memberId string. No other data is encoded in the QR. Store the PNG as a base64 string or save to object storage and store the URL. The QR image is used to print the member\'s digital ID card.', C.lightAmber, C.amber),
  stepSpacer(),
  flowStep('6', 'Insert member document', 'Insert the complete member document into MongoDB with status: "active". Include all validated fields, the generated memberId, expiryDate, qrCodeUrl, registeredBy (from JWT payload), and createdAt timestamp.', C.lightGreen, C.green),
  stepSpacer(),
  flowStep('7', 'Seed Redis cache', 'Immediately write the member\'s cache payload to Redis: SET member:{memberId} {payload} EX 86400. This ensures the first scan of a new member hits the cache.', C.lightGreen, C.green),
  stepSpacer(),
  flowStep('8', 'Return response', 'Return HTTP 201 with memberId, fullName, qrCodeUrl, qrCodeBase64, and the full plan object including the computed expiryDate.', C.lightGreen, C.green),
  spacer(100),

  // ── 5.3 PLAN RENEWAL ──
  h2('5.3 Flow: Plan Renewal or Change'),
  body('Performed by owner or receptionist. Updates the member\'s plan and resets expiry. Must immediately invalidate Redis to prevent stale access control.'),
  spacer(40),

  flowStep('1', 'Validate request', 'Validate: plan.type (enum), plan.allowedDays (if 3-day), plan.durationMonths (positive integer), plan.startDate (ISO date). If startDate is not provided, default to today in gym timezone.', C.lightBlue, C.accent),
  stepSpacer(),
  flowStep('2', 'Compute new expiry date', 'expiryDate = startDate + durationMonths, same logic as registration.', C.lightAmber, C.amber),
  stepSpacer(),
  flowStep('3', 'Update member document in MongoDB', 'Update: set plan.type, plan.allowedDays, plan.startDate, plan.expiryDate, plan.durationMonths. Also set status to "active" (in case the member was previously "expired"). Set updatedAt to now.', C.lightGreen, C.green),
  stepSpacer(),
  flowStep('4', 'CRITICAL: Invalidate Redis cache', 'Execute DEL member:{memberId} on Redis. This step is mandatory. If Redis is unavailable, log the error but do not fail the operation. The background cache pre-warm at 04:00 will re-populate the cache within 24 hours. In the meantime, the MongoDB fallback will be used.', C.lightRed, C.danger),
  stepSpacer(),
  flowStep('5', 'Return response', 'Return HTTP 200 with the updated plan object.', C.lightGreen, C.green),
  spacer(100),

  // ── 5.4 STATUS CHANGE ──
  h2('5.4 Flow: Member Status Change (Suspend, Freeze, Reactivate)'),
  body('Changing a member\'s status to anything other than "active" must take effect immediately on the next scan. This is guaranteed by Redis cache invalidation.'),
  spacer(40),

  flowStep('1', 'Validate request', 'Validate: status (enum: "active" | "suspended" | "frozen"), reason (required string when suspending or freezing). Owner only can make permanent changes.', C.lightBlue, C.accent),
  stepSpacer(),
  flowStep('2', 'Update status in MongoDB', 'Update members: set status, updatedAt. If reactivating (status -> "active"), also verify plan.expiryDate is in the future. If expired, require a plan renewal first; return HTTP 400 with PLAN_EXPIRED error.', C.lightGreen, C.green),
  stepSpacer(),
  flowStep('3', 'CRITICAL: Invalidate Redis cache', 'Execute DEL member:{memberId}. Same importance as plan renewal. A suspended member who is still in Redis cache would be incorrectly granted entry until the 24-hour TTL expires.', C.lightRed, C.danger),
  stepSpacer(),
  flowStep('4', 'Return response', 'Return HTTP 200 with updated status.', C.lightGreen, C.green),
  spacer(100),

  // ── 5.5 STAFF LOGIN ──
  h2('5.5 Flow: Staff Authentication'),
  spacer(40),

  flowStep('1', 'Receive credentials', 'Receive POST /api/v1/auth/login with { email, password }. Normalize email to lowercase before any lookup.', C.lightBlue, C.accent),
  stepSpacer(),
  flowStep('2', 'Find staff by email', 'Query staff: findOne({ email }). Use a Mongoose query that explicitly includes passwordHash and refreshTokenHash (select: false fields must be explicitly re-selected here). If no document found, return HTTP 401 with INVALID_CREDENTIALS. Use the same error message as a wrong password to prevent email enumeration.', C.lightBlue, C.accent),
  stepSpacer(),
  flowStep('3', 'Check account status', 'If staff.status is "inactive", return HTTP 403 with ACCOUNT_INACTIVE. Do this before password verification to avoid bcrypt cost on inactive accounts.', C.lightAmber, C.amber),
  stepSpacer(),
  flowStep('4', 'Verify password', 'Use bcrypt.compare(password, staff.passwordHash). If false, return HTTP 401 with INVALID_CREDENTIALS. Do not reveal which field was wrong.', C.lightAmber, C.amber),
  stepSpacer(),
  flowStep('5', 'Issue tokens', 'Generate access token: sign { staffId: staff._id, role: staff.role } with JWT_SECRET, expiresIn: "15m". Generate refresh token: sign { staffId: staff._id } with JWT_REFRESH_SECRET, expiresIn: "7d". Hash the refresh token with bcrypt (rounds: 10) and store the hash in staff.refreshTokenHash. Update staff.lastLoginAt to now.', C.lightGreen, C.green),
  stepSpacer(),
  flowStep('6', 'Return response', 'Return HTTP 200. Include accessToken in the response body. Set the refresh token as an HTTP-only, Secure, SameSite=Strict cookie named refreshToken with maxAge of 7 days. Never return the refresh token in the response body.', C.lightGreen, C.green),
  spacer(100),

  // ── 5.6 TOKEN REFRESH ──
  h2('5.6 Flow: Silent Token Refresh'),
  spacer(40),

  flowStep('1', 'Read refresh token cookie', 'The browser automatically sends the refreshToken HTTP-only cookie with requests to POST /api/v1/auth/refresh. Extract it from req.cookies. If missing, return HTTP 401.', C.lightBlue, C.accent),
  stepSpacer(),
  flowStep('2', 'Verify and decode token', 'Verify the refresh token signature using JWT_REFRESH_SECRET. If expired or invalid signature, return HTTP 401 with REFRESH_TOKEN_EXPIRED. Extract staffId from the decoded payload.', C.lightBlue, C.accent),
  stepSpacer(),
  flowStep('3', 'Validate against stored hash', 'Query staff by staffId. Compare the incoming token against staff.refreshTokenHash using bcrypt.compare(). If no match, the token has been invalidated (user logged out). Return HTTP 401.', C.lightAmber, C.amber),
  stepSpacer(),
  flowStep('4', 'Issue new access token', 'Sign a new access token with the same payload. Return HTTP 200 with the new accessToken in the response body. The refresh token and cookie are not rotated on every refresh (rotation is optional; implement only if explicitly required later).', C.lightGreen, C.green),
  spacer(100),

  // ── 5.7 PAYMENT RECORDING ──
  h2('5.7 Flow: Record Membership Payment'),
  spacer(40),

  flowStep('1', 'Validate request', 'Validate: memberRef (valid ObjectId), amount (positive integer in cents), paymentMethod (enum), period.month (1-12), period.year (integer). Receptionist can only record direction: "in" payments. Owner can record both income and expenses.', C.lightBlue, C.accent),
  stepSpacer(),
  flowStep('2', 'Verify member exists', 'Query members by memberRef. If not found, return HTTP 404. Snapshot memberName and planType from the member document for embedding in the payment record.', C.lightBlue, C.accent),
  stepSpacer(),
  flowStep('3', 'Insert payment document', 'Insert into payments with all validated fields, the name/plan snapshots, recordedBy from JWT payload, and recordedAt = now.', C.lightGreen, C.green),
  stepSpacer(),
  flowStep('4', 'Update member paymentSummary', 'Update members: set paymentSummary.lastPaidDate, paymentSummary.lastPaidAmount, and recalculate paymentSummary.outstandingBalance. This is a denormalized field; it must be kept in sync on every payment write.', C.lightAmber, C.amber),
  stepSpacer(),
  flowStep('5', 'Return response', 'Return HTTP 201 with the created payment document.', C.lightGreen, C.green),
  spacer(100),

  // ── 5.8 BACKGROUND JOBS ──
  h2('5.8 Flow: Background Jobs (Daily Scheduled Tasks)'),
  body('All three jobs run sequentially inside the Express process using node-cron. They share the same MongoDB and Redis connections as the main application. Jobs are staggered by 5 minutes to avoid concurrent database load.'),
  spacer(60),

  h3('Job 1 \u2014 Cache Pre-Warm (04:00 daily)'),
  flowStep('1', 'Query all active members', 'Execute: members.find({ status: "active" }, { memberId: 1, status: 1, plan: 1, fullName: 1 }). Project only cache-needed fields to minimize data transfer.', C.lightAmber, C.amber),
  stepSpacer(),
  flowStep('2', 'Write to Redis in pipeline', 'For each member, queue a SET member:{memberId} {payload} EX 86400 command. Execute all commands in a single Redis pipeline batch (not individual awaits in a loop). This minimizes round-trip overhead when warming hundreds of keys.', C.lightAmber, C.amber),
  stepSpacer(),
  flowStep('3', 'Log result', 'Log the count of members pre-warmed and total time taken. If any pipeline commands fail, log the errors but do not crash the job.', C.lightGreen, C.green),
  spacer(80),

  h3('Job 2 \u2014 Maintenance Alerts (04:05 daily)'),
  flowStep('1', 'Query equipment with upcoming service', 'Execute: inventory.find({ "maintenance.nextServiceDate": { $lte: sevenDaysFromNow }, condition: { $ne: "retired" } }).', C.lightAmber, C.amber),
  stepSpacer(),
  flowStep('2', 'Check for existing alert', 'For each item, query alerts: findOne({ type: "maintenance-due", subjectRef: item._id, createdAt: { $gte: startOfThisWeek } }). Only insert a new alert if none exists this week. Prevents duplicate alerts for the same equipment.', C.lightAmber, C.amber),
  stepSpacer(),
  flowStep('3', 'Insert alerts', 'For items without a recent alert, insert: type: "maintenance-due", severity: "warning", visibleTo: ["owner", "receptionist"], expiresAt: 14 days from now.', C.lightGreen, C.green),
  spacer(80),

  h3('Job 3 \u2014 Expiry Status Sync (04:10 daily)'),
  flowStep('1', 'Find newly expired members', 'Execute: members.find({ status: "active", "plan.expiryDate": { $lt: todayLocal } }). todayLocal must be computed in gym timezone.', C.lightAmber, C.amber),
  stepSpacer(),
  flowStep('2', 'Bulk update status', 'Execute: members.updateMany({ _id: { $in: expiredIds } }, { $set: { status: "expired" } }). Use updateMany for efficiency rather than individual updates in a loop.', C.lightAmber, C.amber),
  stepSpacer(),
  flowStep('3', 'Invalidate Redis keys', 'For each expired member, execute DEL member:{memberId}. Use a Redis pipeline for batch deletion.', C.lightRed, C.danger),
  stepSpacer(),
  flowStep('4', 'Insert membership-expired alerts', 'Insert one alert per newly expired member. Type: "membership-expired", severity: "critical", visibleTo: ["owner", "receptionist"].', C.lightGreen, C.green),

  spacer(120),
  divider(),
  spacer(60),
  ...infoBox([
    'End of Phase 2 Documentation',
    'Sections covered: 4. MongoDB Database Design  |  5. Core System Flows',
    'Send "continue" to generate Section 6: API Design and Section 7: Role-Based Access Control',
  ], C.lightGray, C.grayText),
  spacer(80),
];

// ─── HEADER & FOOTER ─────────────────────────────────────────────────────────
const docHeader = new Header({
  children: [new Paragraph({
    children: [
      new TextRun({ text: 'Gym Management System \u2014 Technical Specification', font: 'Arial', size: 18, color: C.grayText }),
      new TextRun({ text: '\t', font: 'Arial' }),
      new TextRun({ text: 'CONFIDENTIAL', font: 'Arial', size: 18, bold: true, color: C.danger }),
    ],
    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
    border: { bottom: { style: BorderStyle.SINGLE, size: 3, color: C.midGray, space: 1 } },
    ...sp(0, 80),
  })],
});

const docFooter = new Footer({
  children: [new Paragraph({
    children: [
      new TextRun({ text: 'Phase 2 of 3 \u2014 Database Design & Core System Flows', font: 'Arial', size: 16, color: C.grayText }),
      new TextRun({ text: '\tPage ', font: 'Arial', size: 16, color: C.grayText }),
      new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 16, color: C.grayText }),
    ],
    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
    border: { top: { style: BorderStyle.SINGLE, size: 3, color: C.midGray, space: 1 } },
    ...sp(80, 0),
  })],
});

// ─── COVER PAGE ───────────────────────────────────────────────────────────────
const coverPage = [
  new Paragraph({ children: [new TextRun('')], ...sp(0, 1440) }),
  new Paragraph({
    children: [new TextRun({ text: 'GYM MANAGEMENT SYSTEM', font: 'Arial', size: 52, bold: true, color: C.white })],
    alignment: AlignmentType.CENTER,
    shading: { fill: C.primary, type: ShadingType.CLEAR },
    ...sp(240, 120), indent: { left: 0, right: 0 },
  }),
  new Paragraph({
    children: [new TextRun({ text: 'Complete Technical Specification', font: 'Arial', size: 32, color: C.midBlue })],
    alignment: AlignmentType.CENTER,
    shading: { fill: C.primary, type: ShadingType.CLEAR }, ...sp(0, 120),
  }),
  new Paragraph({
    children: [new TextRun({ text: 'For AI Coding Agent Implementation', font: 'Arial', size: 26, color: C.midGray })],
    alignment: AlignmentType.CENTER,
    shading: { fill: C.primary, type: ShadingType.CLEAR }, ...sp(0, 480),
  }),
  new Paragraph({
    children: [new TextRun({ text: 'Phase 2 of 3', font: 'Arial', size: 24, color: C.white, bold: true })],
    alignment: AlignmentType.CENTER,
    shading: { fill: C.teal, type: ShadingType.CLEAR }, ...sp(0, 60),
  }),
  new Paragraph({
    children: [new TextRun({ text: 'MongoDB Database Design  \u00b7  Core System Flows', font: 'Arial', size: 22, color: C.white })],
    alignment: AlignmentType.CENTER,
    shading: { fill: C.teal, type: ShadingType.CLEAR }, ...sp(0, 480),
  }),
  new Paragraph({
    children: [
      new TextRun({ text: 'Phase 1 covered: ', font: 'Arial', size: 20, bold: true, color: C.darkText }),
      new TextRun({ text: 'Product Overview  \u00b7  Features & Modules  \u00b7  System Architecture', font: 'Arial', size: 20, color: C.grayText }),
    ],
    alignment: AlignmentType.CENTER, ...sp(0, 60),
  }),
  new Paragraph({
    children: [
      new TextRun({ text: 'Phase 3 will cover: ', font: 'Arial', size: 20, bold: true, color: C.darkText }),
      new TextRun({ text: 'API Design  \u00b7  RBAC  \u00b7  Error Handling  \u00b7  Performance  \u00b7  Folder Structure', font: 'Arial', size: 20, color: C.grayText }),
    ],
    alignment: AlignmentType.CENTER, ...sp(0, 80),
  }),
  new Paragraph({
    children: [new TextRun({ text: `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, font: 'Arial', size: 20, color: C.grayText })],
    alignment: AlignmentType.CENTER, ...sp(120, 0),
  }),
  new Paragraph({ children: [new PageBreak()] }),
];

// ─── DOCUMENT ────────────────────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [
      { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 280 } } } }] },
      { reference: 'sub-bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '\u25e6', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 900, hanging: 280 } } } }] },
    ],
  },
  styles: {
    default: { document: { run: { font: 'Arial', size: 22, color: C.darkText } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 36, bold: true, font: 'Arial', color: C.white }, paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 28, bold: true, font: 'Arial', color: C.primary }, paragraph: { spacing: { before: 280, after: 80 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 24, bold: true, font: 'Arial', color: C.accent }, paragraph: { spacing: { before: 200, after: 60 }, outlineLevel: 2 } },
    ],
  },
  sections: [
    {
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 720, right: 1080, bottom: 720, left: 1080 } } },
      children: coverPage,
    },
    {
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } } },
      headers: { default: docHeader },
      footers: { default: docFooter },
      children: [...section4, ...section5],
    },
  ],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('/mnt/user-data/outputs/GMS-Technical-Spec-Phase2.docx', buf);
  console.log('Done');
});
