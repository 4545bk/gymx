const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  LevelFormat, PageNumber, Header, Footer, TabStopType, TabStopPosition,
  PageBreak
} = require('docx');
const fs = require('fs');

// ─── COLORS & BORDERS ────────────────────────────────────────────────────────
const C = {
  primary: '1A3C5E',
  accent: '2E86C1',
  lightBlue: 'D6EAF8',
  midBlue: 'AED6F1',
  darkText: '1C2833',
  grayText: '5D6D7E',
  lightGray: 'F2F3F4',
  midGray: 'D5D8DC',
  white: 'FFFFFF',
  green: '1E8449',
  lightGreen: 'D5F5E3',
  amber: 'B7770D',
  lightAmber: 'FEF9E7',
  danger: 'C0392B',
  lightRed: 'FADBD8',
};

const cellBorder = (color = C.midGray) => ({
  top: { style: BorderStyle.SINGLE, size: 1, color },
  bottom: { style: BorderStyle.SINGLE, size: 1, color },
  left: { style: BorderStyle.SINGLE, size: 1, color },
  right: { style: BorderStyle.SINGLE, size: 1, color },
});

const noBorder = () => ({
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
});



// ─── HELPERS ─────────────────────────────────────────────────────────────────
const sp = (before = 0, after = 0) => ({ spacing: { before, after } });
const indent = (left, hanging) => ({ indent: { left, hanging } });

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

const body = (text, opts = {}) => new Paragraph({
  children: [new TextRun({ text, font: 'Arial', size: 22, color: C.darkText, ...opts })],
  ...sp(60, 60),
});

const bullet = (text, bold_part = '', opts = {}) => {
  const runs = [];
  if (bold_part) {
    runs.push(new TextRun({ text: bold_part, bold: true, font: 'Arial', size: 22, color: C.darkText }));
    runs.push(new TextRun({ text, font: 'Arial', size: 22, color: C.darkText }));
  } else {
    runs.push(new TextRun({ text, font: 'Arial', size: 22, color: C.darkText }));
  }
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    children: runs,
    ...sp(40, 40),
  });
};

const sub_bullet = (text, bold_part = '') => {
  const runs = bold_part
    ? [new TextRun({ text: bold_part, bold: true, font: 'Arial', size: 20, color: C.grayText }),
    new TextRun({ text, font: 'Arial', size: 20, color: C.grayText })]
    : [new TextRun({ text, font: 'Arial', size: 20, color: C.grayText })];
  return new Paragraph({
    numbering: { reference: 'sub-bullets', level: 0 },
    children: runs,
    ...sp(24, 24),
  });
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
  ...sp(40, 40),
  indent: { left: 360, right: 360 },
  border: {
    left: { style: BorderStyle.SINGLE, size: 12, color: C.accent, space: 6 },
  },
});

const infoBox = (lines, color = C.lightBlue, borderColor = C.accent) => {
  return lines.map((line, i) => new Paragraph({
    children: [new TextRun({ text: line, font: 'Arial', size: 20, color: C.darkText, bold: i === 0 })],
    shading: { fill: color, type: ShadingType.CLEAR },
    ...sp(i === 0 ? 40 : 0, i === lines.length - 1 ? 40 : 0),
    indent: { left: 360, right: 360 },
    border: i === 0 ? { left: { style: BorderStyle.SINGLE, size: 16, color: borderColor, space: 8 } }
      : { left: { style: BorderStyle.SINGLE, size: 16, color: borderColor, space: 8 } },
  }));
};

// ─── TABLE HELPERS ───────────────────────────────────────────────────────────
const cell = (text, opts = {}) => new TableCell({
  borders: cellBorder(opts.borderColor || C.midGray),
  shading: { fill: opts.fill || C.white, type: ShadingType.CLEAR },
  margins: { top: 80, bottom: 80, left: 120, right: 120 },
  width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
  verticalAlign: opts.vAlign,
  children: [new Paragraph({
    children: [new TextRun({
      text,
      font: 'Arial',
      size: opts.size || 20,
      bold: opts.bold || false,
      color: opts.color || C.darkText,
    })],
    alignment: opts.align || AlignmentType.LEFT,
  })],
});

const headerCell = (text, width) => cell(text, {
  fill: C.primary, bold: true, color: C.white, size: 20, width,
  borderColor: C.primary,
});

// ─── SECTION 1: PRODUCT OVERVIEW ─────────────────────────────────────────────
const section1 = [
  h1('1. Product Overview'),
  spacer(80),

  h2('1.1 Purpose'),
  body('This document is the complete technical specification for a professional Gym Management System (GMS). It is written for use by an AI coding agent that will implement the system in sequential phases. Every section is prescriptive: it defines what to build, how to build it, and why each decision was made. The agent must follow this specification exactly unless a constraint makes a requirement impossible, in which case the deviation must be noted.'),
  spacer(60),

  h2('1.2 Product Summary'),
  body('The Gym Management System is a web-based application that replaces all manual paper-based operations at a gym facility. It automates member registration, access control, attendance tracking, payment recording, staff management, inventory tracking, and internal alerts. The core automation is a QR-code-based check-in system: every registered member receives a digital ID containing a QR code. When the member arrives at the gym, a hardware scanner reads their QR code, the system validates their membership in real time, and the result (granted or denied) is displayed on a dedicated screen at the entrance.'),
  spacer(60),

  h2('1.3 Target Users'),
  spacer(40),
  ...infoBox([
    'This system has three internal user roles. There is no public-facing or member-facing interface.',
    '',
    'Owner \u2014 Full access to all modules including financial reports, staff management, and system configuration.',
    'Receptionist \u2014 Manages member registration, payment recording, check-in monitoring, and inventory viewing.',
    'Trainer \u2014 Read-only access to their own assigned members and attendance records.',
  ], C.lightBlue, C.accent),
  spacer(80),

  h2('1.4 Scale & Constraints'),
  spacer(40),

  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [3120, 6240],
    rows: [
      new TableRow({ children: [headerCell('Constraint', 3120), headerCell('Requirement', 6240)] }),
      new TableRow({
        children: [
          cell('Active members', { fill: C.lightGray, bold: true, width: 3120 }),
          cell('Up to 5,000', { width: 6240 }),
        ]
      }),
      new TableRow({
        children: [
          cell('QR check-in response', { fill: C.lightGray, bold: true, width: 3120 }),
          cell('Under 1 second end-to-end from scan to screen update', { width: 6240 }),
        ]
      }),
      new TableRow({
        children: [
          cell('Payment processing', { fill: C.lightGray, bold: true, width: 3120 }),
          cell('Manual recording only \u2014 no payment gateway integration', { width: 6240 }),
        ]
      }),
      new TableRow({
        children: [
          cell('Member notifications', { fill: C.lightGray, bold: true, width: 3120 }),
          cell('None \u2014 internal staff alerts only', { width: 6240 }),
        ]
      }),
      new TableRow({
        children: [
          cell('Deployment target', { fill: C.lightGray, bold: true, width: 3120 }),
          cell('Single-tenant, single gym facility', { width: 6240 }),
        ]
      }),
      new TableRow({
        children: [
          cell('Timezone', { fill: C.lightGray, bold: true, width: 3120 }),
          cell('Africa/Addis_Ababa (UTC+3) \u2014 all date logic must use local time', { width: 6240 }),
        ]
      }),
    ],
  }),
  spacer(100),

  h2('1.5 Non-Goals'),
  body('The following are explicitly out of scope for this system and must not be built:'),
  bullet('Online or mobile payment processing (Stripe, Chapa, or similar)'),
  bullet('A member-facing mobile or web application'),
  bullet('SMS or email notifications to members'),
  bullet('Multi-branch or multi-tenant support'),
  bullet('Class scheduling or group session booking'),
  bullet('Workout program design or tracking'),
  bullet('Integration with any third-party fitness platform'),
  spacer(100),

  divider(),
];

// ─── SECTION 2: FEATURES & MODULES ───────────────────────────────────────────
const section2 = [
  spacer(80),
  h1('2. Features & Modules'),
  spacer(80),

  body('The system is divided into eight functional modules. Each module is independently implementable and corresponds to a route group in the backend and a page group in the frontend. The modules and their responsibilities are defined below.'),
  spacer(80),

  // MODULE TABLE
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2000, 2800, 4560],
    rows: [
      new TableRow({
        children: [
          headerCell('Module', 2000),
          headerCell('Primary Users', 2800),
          headerCell('Core Responsibility', 4560),
        ]
      }),
      new TableRow({
        children: [
          cell('QR Check-In', { fill: C.lightGreen, bold: true, width: 2000, color: C.green }),
          cell('Scanner device, Receptionist', { width: 2800 }),
          cell('Validate and record member entry in real time via QR scan', { width: 4560 }),
        ]
      }),
      new TableRow({
        children: [
          cell('Member Management', { fill: C.lightBlue, bold: true, width: 2000, color: C.primary }),
          cell('Owner, Receptionist', { width: 2800 }),
          cell('Register members, assign plans, generate QR IDs, manage status', { width: 4560 }),
        ]
      }),
      new TableRow({
        children: [
          cell('Attendance', { fill: C.lightBlue, bold: true, width: 2000, color: C.primary }),
          cell('Owner, Receptionist, Trainer', { width: 2800 }),
          cell('View and query historical check-in records per member or date', { width: 4560 }),
        ]
      }),
      new TableRow({
        children: [
          cell('Staff Management', { fill: C.lightBlue, bold: true, width: 2000, color: C.primary }),
          cell('Owner', { width: 2800 }),
          cell('Create and manage staff accounts, roles, schedules, and salary records', { width: 4560 }),
        ]
      }),
      new TableRow({
        children: [
          cell('Finance & Billing', { fill: C.lightAmber, bold: true, width: 2000, color: C.amber }),
          cell('Owner, Receptionist (income only)', { width: 2800 }),
          cell('Record membership payments and expenses, generate P&L summaries', { width: 4560 }),
        ]
      }),
      new TableRow({
        children: [
          cell('Inventory', { fill: C.lightAmber, bold: true, width: 2000, color: C.amber }),
          cell('Owner, Receptionist (view)', { width: 2800 }),
          cell('Track gym equipment, condition, maintenance schedules, and purchase history', { width: 4560 }),
        ]
      }),
      new TableRow({
        children: [
          cell('Alerts', { fill: C.lightRed, bold: true, width: 2000, color: C.danger }),
          cell('Owner, Receptionist', { width: 2800 }),
          cell('Internal notifications for expiring memberships, overdue payments, and maintenance due', { width: 4560 }),
        ]
      }),
      new TableRow({
        children: [
          cell('Reports', { fill: C.lightGray, bold: true, width: 2000, color: C.grayText }),
          cell('Owner, Receptionist', { width: 2800 }),
          cell('Aggregated analytics: attendance trends, revenue summaries, member growth', { width: 4560 }),
        ]
      }),
    ],
  }),
  spacer(100),

  h2('2.1 QR Check-In Module'),
  h3('Description'),
  body('This is the highest-priority module. It handles the complete flow from hardware scanner input to attendance record creation. It must operate on a dedicated browser page that runs continuously at the gym entrance and must not require staff interaction for routine check-ins.'),
  h3('Key Features'),
  bullet('Dedicated check-in page with auto-capturing hidden input field for scanner keyboard emulation'),
  bullet('Sub-second membership validation using Redis in-memory cache'),
  bullet('Smart access control enforcing plan type, allowed days, expiry date, and membership status'),
  bullet('Optimistic attendance insertion using MongoDB unique index to prevent duplicate check-ins'),
  bullet('Visual feedback panel showing green (granted) or red (denied) with member name and reason'),
  bullet('Live check-in feed via Server-Sent Events (SSE) visible to receptionist dashboard'),
  bullet('All denied attempts are recorded with reason codes for audit trail'),
  spacer(60),

  h2('2.2 Member Management Module'),
  h3('Description'),
  body('Handles the full lifecycle of a gym member from initial registration to expiry or deletion. Each member receives a unique memberId (UUID) that is encoded in their QR code. The memberId is the primary lookup key throughout the system.'),
  h3('Key Features'),
  bullet('Member registration with full profile: name, phone, emergency contact, photo (optional)'),
  bullet('Two plan types: ', '3-Day Plan'),
  sub_bullet('Member attends on 3 specific days per week (e.g., Mon/Wed/Fri)'),
  sub_bullet('allowedDays array stores ISO weekday numbers [1\u20137]'),
  bullet('Two plan types: ', 'Full-Week Plan'),
  sub_bullet('Member may attend any day of the week'),
  sub_bullet('allowedDays is null; no day restriction applied during check-in'),
  bullet('Configurable plan duration in months with automatic expiry date calculation'),
  bullet('QR code generation on registration; downloadable and printable as digital ID card'),
  bullet('Status management: active, expired, suspended, frozen'),
  bullet('Trainer assignment linking a member to a specific staff trainer'),
  bullet('Redis cache invalidated immediately on any member data change'),
  spacer(60),

  h2('2.3 Staff Management Module'),
  h3('Description'),
  body('Manages all gym staff accounts. Only the owner role can create, modify, or deactivate staff. Staff authenticate using email and password and receive JWT tokens scoped to their role.'),
  h3('Key Features'),
  bullet('Three roles with distinct permission sets: owner, receptionist, trainer'),
  bullet('Trainer profiles with specialization, schedule, and assigned member count'),
  bullet('Salary records embedded in staff document; actual payments recorded in finance module'),
  bullet('Password management with bcrypt hashing; owners can reset any staff password'),
  bullet('Soft deactivation: inactive staff cannot log in but records are preserved'),
  spacer(60),

  h2('2.4 Finance & Billing Module'),
  h3('Description'),
  body('A manual ledger system for recording all financial activity. No payment gateway is used. Every entry is an immutable record; cancellations are handled by inserting reversal documents. The module supports both income (membership fees) and expenses (salaries, equipment, utilities).'),
  h3('Key Features'),
  bullet('Record membership payments linked to a specific member and plan period'),
  bullet('Record expenses by category: salary, equipment, utilities, other'),
  bullet('Monthly and yearly profit-and-loss summary queries'),
  bullet('Payment voiding via reversal document (original record never deleted)'),
  bullet('Outstanding balance tracking embedded in the member document for fast display'),
  spacer(60),

  h2('2.5 Inventory Module'),
  h3('Description'),
  body('Tracks all physical gym equipment including condition, purchase history, and maintenance schedule. The module generates alerts when equipment maintenance is due.'),
  h3('Key Features'),
  bullet('Equipment registry with name, brand, serial number, quantity, and condition'),
  bullet('Condition states: good, fair, needs-repair, retired'),
  bullet('Maintenance scheduling with configurable interval in months'),
  bullet('Automatic next service date computation on service log entry'),
  bullet('Maintenance-due alerts generated by background job and surfaced in alerts module'),
  spacer(60),

  h2('2.6 Alerts Module'),
  h3('Description'),
  body('An internal notification queue visible only to owner and receptionist roles. Alerts are generated automatically by background jobs and by the check-in service. Members never receive alerts directly.'),
  h3('Alert Types'),

  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2800, 1800, 4760],
    rows: [
      new TableRow({ children: [headerCell('Alert Type', 2800), headerCell('Severity', 1800), headerCell('Trigger', 4760)] }),
      new TableRow({ children: [cell('membership-expiring', { width: 2800 }), cell('warning', { width: 1800 }), cell('Membership expires within 5 days (checked at scan time)', { width: 4760 })] }),
      new TableRow({ children: [cell('membership-expired', { width: 2800 }), cell('critical', { width: 1800 }), cell('Scan denied due to expiry; status auto-updated', { width: 4760 })] }),
      new TableRow({ children: [cell('payment-overdue', { width: 2800 }), cell('warning', { width: 1800 }), cell('Outstanding balance recorded on member for >7 days', { width: 4760 })] }),
      new TableRow({ children: [cell('maintenance-due', { width: 2800 }), cell('warning', { width: 1800 }), cell('Equipment nextServiceDate within 7 days (daily job at 04:00)', { width: 4760 })] }),
      new TableRow({ children: [cell('manual', { width: 2800 }), cell('info', { width: 1800 }), cell('Owner or receptionist creates a note for internal communication', { width: 4760 })] }),
    ],
  }),
  spacer(100),

  divider(),
];

// ─── SECTION 3: SYSTEM ARCHITECTURE ──────────────────────────────────────────
const section3 = [
  spacer(80),
  h1('3. System Architecture'),
  spacer(80),

  h2('3.1 Architecture Pattern'),
  body('The system follows a three-tier architecture: a Next.js frontend (presentation layer), an Express.js REST API (business logic layer), and MongoDB with Redis (data layer). These layers communicate exclusively through defined interfaces. The frontend never touches the database directly. The QR scanner communicates only with the backend API using a static API key; it has no connection to the frontend.'),
  spacer(60),

  h2('3.2 Component Overview'),
  spacer(40),

  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2200, 2400, 4760],
    rows: [
      new TableRow({ children: [headerCell('Component', 2200), headerCell('Technology', 2400), headerCell('Role', 4760)] }),
      new TableRow({
        children: [
          cell('Dashboard (Frontend)', { fill: C.lightGray, bold: true, width: 2200 }),
          cell('Next.js 14 (App Router)', { width: 2400 }),
          cell('Staff-facing UI for all modules. Server-side rendering for initial load; client-side data fetching via REST API calls using fetch or Axios.', { width: 4760 }),
        ]
      }),
      new TableRow({
        children: [
          cell('Check-In Page (Frontend)', { fill: C.lightGreen, bold: true, width: 2200, color: C.green }),
          cell('Next.js \u2014 dedicated route', { width: 2400 }),
          cell('Standalone page at /checkin with no layout. Captures scanner keyboard input, fires API call, displays result. Connects to SSE stream for live feed.', { width: 4760 }),
        ]
      }),
      new TableRow({
        children: [
          cell('REST API (Backend)', { fill: C.lightBlue, bold: true, width: 2200, color: C.primary }),
          cell('Node.js + Express.js', { width: 2400 }),
          cell('All business logic lives here. Exposes versioned REST endpoints under /api/v1. Validates inputs, enforces role-based access, orchestrates service calls.', { width: 4760 }),
        ]
      }),
      new TableRow({
        children: [
          cell('Primary Database', { fill: C.lightGray, bold: true, width: 2200 }),
          cell('MongoDB (Mongoose ODM)', { width: 2400 }),
          cell('Persistent storage for all collections: members, attendance, staff, payments, inventory, alerts. All documents use explicit indexes defined at schema level.', { width: 4760 }),
        ]
      }),
      new TableRow({
        children: [
          cell('Cache Layer', { fill: C.lightAmber, bold: true, width: 2200, color: C.amber }),
          cell('Redis', { width: 2400 }),
          cell('In-memory cache for active member records. Used exclusively on the QR check-in hot path to achieve sub-100ms lookup. TTL: 24 hours per key.', { width: 4760 }),
        ]
      }),
      new TableRow({
        children: [
          cell('QR Scanner', { fill: C.lightGreen, bold: true, width: 2200, color: C.green }),
          cell('USB hardware device', { width: 2400 }),
          cell('Acts as keyboard input device. Sends memberId string followed by Enter keypress into the focused check-in page input field. Authenticated to backend via static API key in request header.', { width: 4760 }),
        ]
      }),
      new TableRow({
        children: [
          cell('Background Jobs', { fill: C.lightGray, bold: true, width: 2200 }),
          cell('node-cron (in-process)', { width: 2400 }),
          cell('Scheduled tasks running inside the Express process. Jobs: cache pre-warm (04:00), maintenance-due alerts (04:05), expiry status sync (04:10).', { width: 4760 }),
        ]
      }),
    ],
  }),
  spacer(100),

  h2('3.3 Interaction Model'),
  h3('Staff Dashboard \u2192 Backend'),
  body('All dashboard pages communicate with the backend exclusively via authenticated REST API calls. The Next.js frontend stores the JWT access token in memory (React state or context) and includes it in the Authorization: Bearer header on every request. The refresh token is stored in an HTTP-only cookie, set by the server, and sent automatically by the browser to the /api/v1/auth/refresh endpoint when the access token expires. The frontend handles silent token refresh transparently using an Axios interceptor or fetch wrapper.'),
  spacer(60),

  h3('Scanner \u2192 Backend'),
  body('The hardware QR scanner is connected via USB to the check-in station computer. It emulates keyboard input. The check-in page (a Next.js route running in fullscreen on that computer) maintains focus on a hidden input field. When a QR code is scanned, the scanner types the memberId string and sends an Enter keystroke. The page captures this, fires a POST /api/v1/checkin request with the x-scanner-key header and memberId body, and displays the API response. The scanner never communicates directly with MongoDB or Redis.'),
  spacer(60),

  h3('Live Feed: Backend \u2192 Dashboard'),
  body('The receptionist dashboard and check-in page receive real-time check-in events via Server-Sent Events (SSE). After writing an attendance record, the check-in service emits an event to an in-process SSE broker. All connected clients (check-in page and dashboard) receive the event and update their live feed display. This requires no polling and maintains one persistent HTTP connection per client.'),
  spacer(80),

  h2('3.4 Authentication Architecture'),
  spacer(40),
  ...infoBox([
    'Two separate credential systems exist in this application. They must never be conflated.',
    '',
    'Staff JWT System: Staff log in at /api/v1/auth/login with email + password. Server issues a short-lived access token (15 minutes, in response body) and a long-lived refresh token (7 days, HTTP-only cookie). Every protected API route validates the JWT in the Authorization header. Role is embedded in the token payload as { staffId, role }.',
    '',
    'Scanner API Key: A single static secret string stored in the server environment as SCANNER_API_KEY. The check-in station is configured with this key once. Every scan request includes it as the x-scanner-key header. This key does not expire; it is rotated manually if compromised. The check-in endpoint (/api/v1/checkin) accepts ONLY this key \u2014 it rejects JWT tokens.',
  ], C.lightBlue, C.accent),
  spacer(80),

  h2('3.5 Redis Cache Architecture'),
  h3('Purpose'),
  body('Redis exists solely to serve the QR check-in hot path. It is not used for session storage, general caching, or pub/sub. The goal is to resolve a member lookup in under 5ms so the total check-in response is well under 1 second even at peak load.'),
  h3('Cache Key Format'),
  code('member:{memberId}     Example: member:MBR-7F3A9C2B'),
  h3('Cached Payload'),
  body('Each key stores a JSON string containing only the fields needed for check-in validation: status, plan.type, plan.allowedDays, plan.expiryDate, fullName, and memberId. The full member document is never cached.'),
  h3('TTL'),
  body('Each key has a 24-hour TTL from the time of last write. A background job at 04:00 pre-warms the cache by loading all active members, eliminating cold-start cache misses at gym opening.'),
  h3('Invalidation'),
  body('Whenever the members service writes to MongoDB (update status, change plan, register new member), it must immediately execute DEL member:{memberId} on Redis. This is not optional. Stale cache is the most dangerous failure mode in this system \u2014 it could allow an expired or suspended member to enter.'),
  h3('Graceful Fallback'),
  body('If Redis is unavailable (connection refused, timeout), the check-in service must catch the error, log it, and fall through to a direct MongoDB query. The check-in must not fail because Redis is down. A slower response is always preferable to a system outage.'),
  spacer(80),

  h2('3.6 Background Jobs'),
  spacer(40),

  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2400, 1600, 5360],
    rows: [
      new TableRow({ children: [headerCell('Job', 2400), headerCell('Schedule', 1600), headerCell('Action', 5360)] }),
      new TableRow({
        children: [
          cell('Cache Pre-Warm', { width: 2400 }),
          cell('04:00 daily', { width: 1600 }),
          cell('Queries all members with status "active". Writes each to Redis with 24h TTL. Ensures zero cold-start misses at gym opening.', { width: 5360 }),
        ]
      }),
      new TableRow({
        children: [
          cell('Maintenance Alerts', { width: 2400 }),
          cell('04:05 daily', { width: 1600 }),
          cell('Queries inventory where nextServiceDate <= today + 7 days AND condition != "retired". Inserts maintenance-due alert if one does not already exist for that item this week.', { width: 5360 }),
        ]
      }),
      new TableRow({
        children: [
          cell('Expiry Status Sync', { width: 2400 }),
          cell('04:10 daily', { width: 1600 }),
          cell('Queries members where status = "active" AND plan.expiryDate < today. Bulk updates status to "expired". Invalidates their Redis keys. Inserts membership-expired alerts.', { width: 5360 }),
        ]
      }),
    ],
  }),
  spacer(100),

  h2('3.7 Security Architecture'),
  h3('JWT Security'),
  bullet('Access tokens: 15-minute expiry, signed with HS256 using JWT_SECRET environment variable'),
  bullet('Refresh tokens: 7-day expiry, stored as HTTP-only, Secure, SameSite=Strict cookie'),
  bullet('Refresh token hash stored in staff document; invalidated on logout'),
  bullet('Role embedded in token payload; role guard middleware re-checks on every protected route'),
  spacer(40),
  h3('Input Validation'),
  bullet('All request bodies validated with Zod schemas before reaching controller logic'),
  bullet('memberId format validated by regex before any Redis or MongoDB call on check-in path'),
  bullet('MongoDB query parameters are always typed and never interpolated from raw user input'),
  spacer(40),
  h3('Scanner Key Security'),
  bullet('API key compared using crypto.timingSafeEqual to prevent timing attacks'),
  bullet('Check-in endpoint has no JWT middleware \u2014 only API key middleware runs'),
  bullet('Scanner key stored in environment variable SCANNER_API_KEY, never hardcoded'),
  spacer(40),
  h3('Role Enforcement'),
  bullet('Role is enforced at the service layer, not only at the route middleware level'),
  bullet('Trainer queries automatically append { assignedTrainerId: req.staff.id } filter \u2014 trainers cannot bypass this by manipulating query parameters'),
  bullet('Financial data (payments, P&L, salary) is accessible only to the owner role'),
  spacer(80),

  h2('3.8 Environment Variables'),
  body('The following environment variables are required. The application must not start if any required variable is missing.'),
  spacer(40),

  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [3200, 1200, 4960],
    rows: [
      new TableRow({ children: [headerCell('Variable', 3200), headerCell('Required', 1200), headerCell('Description', 4960)] }),
      new TableRow({ children: [cell('MONGODB_URI', { width: 3200 }), cell('Yes', { width: 1200, bold: true, color: C.danger }), cell('Full MongoDB connection string', { width: 4960 })] }),
      new TableRow({ children: [cell('REDIS_URL', { width: 3200 }), cell('Yes', { width: 1200, bold: true, color: C.danger }), cell('Redis connection URL (e.g., redis://localhost:6379)', { width: 4960 })] }),
      new TableRow({ children: [cell('JWT_SECRET', { width: 3200 }), cell('Yes', { width: 1200, bold: true, color: C.danger }), cell('Secret for signing JWT access tokens (min 32 chars)', { width: 4960 })] }),
      new TableRow({ children: [cell('JWT_REFRESH_SECRET', { width: 3200 }), cell('Yes', { width: 1200, bold: true, color: C.danger }), cell('Separate secret for refresh tokens (min 32 chars)', { width: 4960 })] }),
      new TableRow({ children: [cell('SCANNER_API_KEY', { width: 3200 }), cell('Yes', { width: 1200, bold: true, color: C.danger }), cell('Static secret for QR scanner device authentication', { width: 4960 })] }),
      new TableRow({ children: [cell('PORT', { width: 3200 }), cell('No', { width: 1200 }), cell('API server port (default: 5000)', { width: 4960 })] }),
      new TableRow({ children: [cell('NODE_ENV', { width: 3200 }), cell('No', { width: 1200 }), cell('development | production (default: development)', { width: 4960 })] }),
      new TableRow({ children: [cell('NEXT_PUBLIC_API_URL', { width: 3200 }), cell('Yes', { width: 1200, bold: true, color: C.danger }), cell('Base URL of the Express API, used by Next.js frontend', { width: 4960 })] }),
      new TableRow({ children: [cell('GYM_TIMEZONE', { width: 3200 }), cell('No', { width: 1200 }), cell('IANA timezone string (default: Africa/Addis_Ababa)', { width: 4960 })] }),
    ],
  }),

  spacer(120),
  divider(),
  spacer(60),
  ...infoBox([
    'End of Phase 1 Documentation',
    'Sections covered: 1. Product Overview  |  2. Features & Modules  |  3. System Architecture',
    'Send "continue" to generate Section 4: MongoDB Database Design',
  ], C.lightGray, C.grayText),
  spacer(80),
];

// ─── HEADER & FOOTER ─────────────────────────────────────────────────────────
const docHeader = new Header({
  children: [
    new Paragraph({
      children: [
        new TextRun({ text: 'Gym Management System \u2014 Technical Specification', font: 'Arial', size: 18, color: C.grayText }),
        new TextRun({ text: '\t', font: 'Arial' }),
        new TextRun({ text: 'CONFIDENTIAL', font: 'Arial', size: 18, bold: true, color: C.danger }),
      ],
      tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
      border: { bottom: { style: BorderStyle.SINGLE, size: 3, color: C.midGray, space: 1 } },
      ...sp(0, 80),
    }),
  ],
});

const docFooter = new Footer({
  children: [
    new Paragraph({
      children: [
        new TextRun({ text: 'Phase 1 of 3 \u2014 Product Overview, Features & Architecture', font: 'Arial', size: 16, color: C.grayText }),
        new TextRun({ text: '\tPage ', font: 'Arial', size: 16, color: C.grayText }),
        new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 16, color: C.grayText }),
      ],
      tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
      border: { top: { style: BorderStyle.SINGLE, size: 3, color: C.midGray, space: 1 } },
      ...sp(80, 0),
    }),
  ],
});

// ─── COVER PAGE ───────────────────────────────────────────────────────────────
const coverPage = [
  new Paragraph({
    children: [new TextRun('')],
    ...sp(0, 1440),
  }),
  new Paragraph({
    children: [new TextRun({ text: 'GYM MANAGEMENT SYSTEM', font: 'Arial', size: 52, bold: true, color: C.white })],
    alignment: AlignmentType.CENTER,
    shading: { fill: C.primary, type: ShadingType.CLEAR },
    ...sp(240, 120),
    indent: { left: 0, right: 0 },
  }),
  new Paragraph({
    children: [new TextRun({ text: 'Complete Technical Specification', font: 'Arial', size: 32, color: C.midBlue })],
    alignment: AlignmentType.CENTER,
    shading: { fill: C.primary, type: ShadingType.CLEAR },
    ...sp(0, 120),
  }),
  new Paragraph({
    children: [new TextRun({ text: 'For AI Coding Agent Implementation', font: 'Arial', size: 26, color: C.midGray })],
    alignment: AlignmentType.CENTER,
    shading: { fill: C.primary, type: ShadingType.CLEAR },
    ...sp(0, 480),
  }),
  new Paragraph({
    children: [new TextRun({ text: 'Phase 1 of 3', font: 'Arial', size: 24, color: C.white, bold: true })],
    alignment: AlignmentType.CENTER,
    shading: { fill: C.accent, type: ShadingType.CLEAR },
    ...sp(0, 60),
  }),
  new Paragraph({
    children: [new TextRun({ text: 'Product Overview  \u00b7  Features & Modules  \u00b7  System Architecture', font: 'Arial', size: 22, color: C.white })],
    alignment: AlignmentType.CENTER,
    shading: { fill: C.accent, type: ShadingType.CLEAR },
    ...sp(0, 480),
  }),
  new Paragraph({
    children: [
      new TextRun({ text: 'Tech Stack:  ', font: 'Arial', size: 22, bold: true, color: C.darkText }),
      new TextRun({ text: 'Next.js  \u00b7  Node.js + Express  \u00b7  MongoDB  \u00b7  Redis', font: 'Arial', size: 22, color: C.grayText }),
    ],
    alignment: AlignmentType.CENTER,
    ...sp(0, 80),
  }),
  new Paragraph({
    children: [
      new TextRun({ text: 'Scale:  ', font: 'Arial', size: 22, bold: true, color: C.darkText }),
      new TextRun({ text: 'Up to 5,000 active members  \u00b7  QR check-in < 1 second', font: 'Arial', size: 22, color: C.grayText }),
    ],
    alignment: AlignmentType.CENTER,
    ...sp(0, 80),
  }),
  new Paragraph({
    children: [new TextRun({ text: `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, font: 'Arial', size: 20, color: C.grayText })],
    alignment: AlignmentType.CENTER,
    ...sp(120, 0),
  }),
  new Paragraph({ children: [new PageBreak()] }),
];

// ─── ASSEMBLE DOCUMENT ────────────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: '\u2022',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 540, hanging: 280 } } },
        }],
      },
      {
        reference: 'sub-bullets',
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: '\u25e6',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 900, hanging: 280 } } },
        }],
      },
    ],
  },
  styles: {
    default: {
      document: { run: { font: 'Arial', size: 22, color: C.darkText } },
    },
    paragraphStyles: [
      {
        id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 36, bold: true, font: 'Arial', color: C.white },
        paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 0 },
      },
      {
        id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, font: 'Arial', color: C.primary },
        paragraph: { spacing: { before: 280, after: 80 }, outlineLevel: 1 },
      },
      {
        id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: 'Arial', color: C.accent },
        paragraph: { spacing: { before: 200, after: 60 }, outlineLevel: 2 },
      },
    ],
  },
  sections: [
    // Cover — no header/footer
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 720, right: 1080, bottom: 720, left: 1080 },
        },
      },
      children: coverPage,
    },
    // Main content
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
        },
      },
      headers: { default: docHeader },
      footers: { default: docFooter },
      children: [
        ...section1,
        ...section2,
        ...section3,
      ],
    },
  ],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('/mnt/user-data/outputs/GMS-Technical-Spec-Phase1.docx', buf);
  console.log('Done');
});
