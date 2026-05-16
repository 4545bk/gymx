# GymX — Google Stitch UI Design Prompts (Part 1)

> **How to use:** Copy each prompt below and paste it into Google Stitch to generate the UI design for that page. Each prompt is self-contained with full context.

---

## 1. LOGIN PAGE

```
Design a premium dark-themed login page for "GymX" — a professional gym management system.

DESIGN SYSTEM:
- Background: #0a0e1a (deep navy-black)
- Card background: #1a1f35 with 1px border #1e293b
- Primary accent: linear-gradient(135deg, #3b82f6, #06b6d4) — blue to cyan
- Text: #f1f5f9 (primary), #94a3b8 (secondary), #64748b (muted)
- Input fields: #141929 background, #1e293b border, focus state glows blue
- Font: Inter (Google Font), weights 400-800
- Border radius: 20px for cards, 10px for inputs/buttons
- Shadows: deep shadows with 0 8px 30px rgba(0,0,0,0.5)

LAYOUT:
- Full-screen centered vertically and horizontally
- Two large decorative radial gradient circles in background (one top-left blue, one bottom-right cyan, both very subtle ~8% opacity)
- Max-width 420px login card

CONTENT (top to bottom):
1. LOGO AREA:
   - A 64x64px rounded square icon with the blue-to-cyan gradient background containing a dumbbell icon in white
   - Below it: "GymX" in large bold text (2rem) with gradient text effect (blue-to-cyan)
   - Below that: "Gym Management System" in muted gray text (0.9rem)

2. LOGIN CARD:
   - Background: #1a1f35, border: 1px solid #1e293b, border-radius: 20px, padding: 2rem
   - Heading: "Welcome back" (1.25rem, bold)
   - Subtitle: "Sign in to access your dashboard" (0.85rem, muted)
   - ERROR ALERT (shown conditionally): red-tinted background with AlertCircle icon and error text
   - EMAIL INPUT: label "EMAIL" (uppercase, small, muted), dark input field with placeholder "owner@gymx.com"
   - PASSWORD INPUT: label "PASSWORD", dark input field with placeholder dots, an eye/eye-off toggle button on the right side inside the input
   - SUBMIT BUTTON: full-width, blue-to-cyan gradient background, white text "Sign In", bold, with subtle glow shadow. Shows a spinner when loading.

3. FOOTER TEXT:
   - Small muted text: "Staff accounts are managed by the gym owner"

INTERACTION STATES:
- Input focus: blue border with 3px blue glow ring
- Button hover: intensified glow shadow
- Slide-up entrance animation (500ms ease)

The overall feel should be ultra-premium, sleek, and modern — like a SaaS product login, not a gym website.
```

---

## 2. DASHBOARD PAGE

```
Design a premium dark-themed admin dashboard page for "GymX" — a gym management system. This is the main landing page after login.

DESIGN SYSTEM:
- Background: #0a0e1a
- Card background: #1a1f35, borders: #1e293b
- Elevated surfaces: #252b45
- Accent gradient: linear-gradient(135deg, #3b82f6, #06b6d4)
- Success: #22c55e, Warning: #f59e0b, Danger: #ef4444, Info: #3b82f6
- Font: Inter, all weights 300-800
- Border radius: 16px for cards, 20px for large elements

PAGE STRUCTURE:
The page has a fixed left sidebar (260px wide) and a top bar. The main content area is to the right of the sidebar.

LEFT SIDEBAR (260px, background #111827):
- Top: GymX logo (dumbbell icon in gradient square + "GymX" gradient text)
- Navigation sections with small uppercase gray section labels:
  - OVERVIEW: Dashboard (active — highlighted with blue bg), Check-In Scanner
  - MANAGEMENT: Members, Attendance, Staff
  - OPERATIONS: Finance, Dues, Inventory, Alerts, Reports
  - COMMERCE: Products, Sales
  - ADMIN: Settings
- Each nav item has a Lucide icon on the left and text label
- Active item: blue text (#3b82f6), light blue background (rgba(59,130,246,0.1))
- Hover: slightly lighter background
- Bottom: Staff name + role badge + Logout button

TOP BAR (sticky, #111827, border-bottom #1e293b):
- Left: Page title "Dashboard" (1.25rem bold)
- Right: notification bell icon with red unread badge count "3"

MAIN CONTENT:

1. WELCOME BANNER:
   - Full-width card with the blue-to-cyan gradient background
   - "Welcome back, Dawit 👋" in white (1.4rem)
   - "Here's what's happening at your gym today" in white 80% opacity
   - Decorative circle shape (rgba white 8%) on the right side, partially cropped
   - Border-radius: 20px

2. STATS GRID (responsive, 4 columns on desktop):
   Each stat card has:
   - Dark card bg (#1a1f35), thin border, 16px radius
   - A colored 3px accent line at the very top of the card
   - Icon on the right (muted opacity), label + big number on left
   
   Cards:
   a) "ACTIVE MEMBERS" — blue top bar, Users icon, value "312", subtitle "+41 this month" in green
   b) "TODAY'S CHECK-INS" — green top bar, CalendarCheck icon, value "87"
   c) "EXPIRING SOON" — amber/yellow top bar, AlertTriangle icon, value "23", subtitle "67 in 30 days" in red
   d) "NET PROFIT" — cyan top bar, TrendingUp icon, value "163,000 ETB" (smaller font)
   e) "UNREAD ALERTS" — red top bar, Activity icon, value "7"
   f) "OUTSTANDING DUES" — amber top bar, Wallet icon, value "45,200 ETB", subtitle "5 overdue · 12 unpaid · 8 partial" in red

   Cards hover: slight translateY(-2px) lift with larger shadow

3. TWO-COLUMN GRID below stats:

   LEFT CARD — "Recent Check-ins" (with Clock icon, blue):
   - List of 8 recent check-in entries
   - Each row: dark elevated bg (#252b45), rounded, with member name (bold) + plan type (muted) on left, and a status badge on right
   - Badges: "granted" = green pill badge, "denied" = red pill badge
   - Example entries: "Selam Tesfaye / 3-day plan / GRANTED", "Abebe Girma / full-week plan / DENIED"

   RIGHT CARD — "Member Overview" (with UserPlus icon, green):
   - Status breakdown list with colored dots:
     - Active: green dot, value 312
     - Expired: red dot, value 89
     - Suspended: amber dot, value 12
     - Frozen: blue dot, value 3
   - Divider line
   - "BY PLAN TYPE" subsection header (uppercase, tiny, muted)
   - Plan breakdown: "full-week: 198", "3-day: 114"

Make everything feel data-rich but clean. The dashboard should look like a premium analytics platform.
```

---

## 3. CHECK-IN SCANNER PAGE

```
Design a fullscreen dark-themed QR check-in scanner page for "GymX" gym management system. This page runs on a dedicated screen at the gym entrance door — no sidebar, no navigation.

DESIGN SYSTEM:
- Background: #0a0e1a
- Success green: #22c55e with glow rgba(34,197,94,0.2)
- Danger red: #ef4444 with glow rgba(239,68,68,0.2)
- Warning amber: #f59e0b
- Card bg: #1a1f35
- Font: Inter

LAYOUT: Full viewport height, centered, no sidebar or navigation. Clean and distraction-free.

TOP SECTION:
- "GymX" logo with gradient text, centered
- A status indicator showing "Connected" with a pulsing green dot (SSE connection status)
- Hidden text input (the QR scanner types into this invisible field)

CENTER — FEEDBACK PANEL (the main focus):
This shows the result of the last QR scan. Three possible states:

STATE 1 — GRANTED (show this as the default/demo state):
- Large card (min-width 400px), centered
- Background: rgba(34,197,94,0.1) with 2px solid #22c55e border
- Massive green glow shadow: 0 0 60px rgba(34,197,94,0.2)
- Giant green checkmark icon (4rem) at top
- Member name: "Selam Tesfaye" (1.75rem, bold, white)
- Plan info: "3-day plan • Expires Jun 1, 2026" (1rem, muted)
- Pulse-in animation (scale 0.9 to 1.02 to 1.0)

STATE 2 — DENIED (show as a smaller reference):
- Same card structure but red theme
- Background: rgba(239,68,68,0.1) with 2px solid #ef4444 border
- Red glow shadow
- Giant red X icon
- Member name in white
- Deny reason: "Membership expired on May 1, 2026" or "Wrong day — next allowed: Wednesday" or "Already checked in today at 07:34 AM"

STATE 3 — DUPLICATE (reference):
- Same structure but amber/yellow theme
- "Already checked in today" message with first check-in time

BOTTOM SECTION — LIVE FEED:
- Card titled "Live Feed" with a small Activity icon
- Shows the last 10 check-in events in real-time (SSE stream)
- Each entry is a horizontal row with:
  - Time: "07:34 AM" (muted, small)
  - Name: "Selam Tesfaye" (bold)
  - Plan: "3-day" (muted)
  - Status badge: green "GRANTED" or red "DENIED" pill
- New entries slide in from the right with animation
- Scrollable if overflow

IDLE STATE (when no recent scan):
- Show a large QR code icon (muted, 48px) centered
- Text: "Waiting for QR scan..." in muted
- Subtle pulse animation on the icon

The page should feel like a kiosk display — large fonts, high contrast, instant visual feedback. No clutter.
```

---

## 4. MEMBERS PAGE

```
Design a premium dark-themed member management page for "GymX" gym management system. This is a data-heavy page with a searchable, filterable table of gym members.

DESIGN SYSTEM:
- Background: #0a0e1a, Cards: #1a1f35, Borders: #1e293b
- Elevated: #252b45, Input bg: #141929
- Accent gradient: linear-gradient(135deg, #3b82f6, #06b6d4)
- Status badges: active=#22c55e, expired=#ef4444, suspended=#f59e0b, frozen=#3b82f6
- Payment badges: paid=green, partial=amber, unpaid=red, overdue=dark red
- Font: Inter, radius: 16px cards, 10px inputs

LAYOUT: Left sidebar (260px, same as dashboard) + top bar + main content area.

TOP BAR:
- Title: "Members" (bold)
- Right side: blue gradient "Add Member" button with UserPlus icon

TOOLBAR ROW (below top bar):
- Search input: magnifying glass icon, placeholder "Search by name or phone...", dark input style, takes ~40% width
- Filter dropdowns (dark select inputs):
  - Status: All Statuses / Active / Expired / Suspended / Frozen
  - Plan: All Plans / Full Week / 3-Day / Weekend
  - Payment: All / Paid / Partial / Unpaid / Overdue
- A "Reset Filters" ghost button on the right

MEMBERS TABLE (inside a card with rounded borders):
- Table header row: dark elevated bg (#252b45), uppercase tiny muted column labels
- Columns: NAME, PHONE, PLAN, STATUS, PAYMENT, EXPIRY, ACTIONS

Each row shows:
- NAME column: Full name in white bold (0.875rem), member ID "MBR-7F3A9C2B" below in tiny muted text
- PHONE: "+251911234567" in secondary text
- PLAN: "full-week" or "3-day" as plain text
- STATUS: Pill badge — "ACTIVE" green, "EXPIRED" red, "SUSPENDED" amber, "FROZEN" blue
- PAYMENT: Pill badge — "PAID" green, "PARTIAL" amber, "UNPAID" orange-red, "OVERDUE" dark red
- EXPIRY: Date "Jun 1, 2026" with "26 days" subtitle. If expiring within 7 days, show in amber.
- ACTIONS: Three small icon buttons in a row:
  - Eye icon (view detail)
  - QrCode icon (show QR)
  - CreditCard icon (download membership card PDF)
  - Edit icon (edit member)

Show 10 example rows with realistic Ethiopian names like: Selam Tesfaye, Abebe Girma, Hana Bekele, Yonas Tadesse, Meron Hailu, Dawit Alemu, Tigist Worku, Bereket Asfaw, Lidya Teshome, Fikru Mengistu

Row hover: subtle background change to #222842

PAGINATION BAR (bottom of table):
- Left: "Showing 1-20 of 312 members" in muted
- Right: Previous/Next buttons (secondary style)

MODAL — Add/Edit Member (show as overlay):
- Dark modal card (#1a1f35), 560px max-width, 20px radius
- Header: "Register New Member" with X close button
- Form fields:
  - Full Name (text input)
  - Phone Number (text input with +251 prefix)
  - Plan Type (select: Full Week / 3-Day / Weekend)
  - Allowed Days (multi-select checkboxes for Mon-Sun, shown only for 3-day)
  - Duration (select: 1 Month / 3 Months / 6 Months / 12 Months)
  - Start Date (date input)
  - Assigned Trainer (select dropdown)
  - Emergency Contact Name + Phone (two inputs side by side)
- Footer: Cancel (secondary) + Register (primary gradient) buttons

The page should feel like a professional CRM system — clean data presentation with powerful filtering.
```

---

## 5. FINANCE PAGE

```
Design a premium dark-themed financial ledger page for "GymX" gym management system. This page shows all income and expenses with a monthly P&L summary.

DESIGN SYSTEM:
- Background: #0a0e1a, Cards: #1a1f35, Borders: #1e293b
- Income green: #22c55e, Expense red: #ef4444
- Accent gradient: linear-gradient(135deg, #3b82f6, #06b6d4)
- Font: Inter, currency: ETB (Ethiopian Birr)

LAYOUT: Left sidebar + top bar + main content.

TOP BAR:
- Title: "Finance"
- Right: "Record Payment" blue gradient button with Plus icon

SUMMARY CARDS ROW (3 columns):
1. "Total Income" — green top accent bar, DollarSign icon, value "248,000 ETB" in large bold, subtitle "This month" in muted
2. "Total Expenses" — red top accent bar, TrendingDown icon, value "85,000 ETB"
3. "Net Profit" — cyan top accent bar, TrendingUp icon, value "163,000 ETB", with a green percentage "+8.2% vs last month"

FILTER TOOLBAR:
- Month/Year picker: two select dropdowns side by side (Month: January-December, Year: 2026)
- Direction filter: "All" / "Income" / "Expense" toggle buttons (pill-shaped, active one highlighted)
- Type filter: select dropdown — All Types / Membership / Expense / Salary / Other
- "Download Summary" ghost button with Download icon

TRANSACTIONS TABLE (card with rounded borders):
- Column headers: DATE, DESCRIPTION, TYPE, DIRECTION, AMOUNT, METHOD, RECORDED BY, ACTIONS
- Each row:
  - DATE: "May 1, 2026" in secondary text, time "09:22 AM" below in tiny muted
  - DESCRIPTION: "Monthly membership — Selam Tesfaye" or "Electricity bill — May 2026" or "Salary — Dawit Alemu"
  - TYPE: badge — "membership" blue, "expense" amber, "salary" purple
  - DIRECTION: arrow icon — green up arrow for "in", red down arrow for "out"
  - AMOUNT: "800 ETB" — green text for income, red text for expenses. Bold.
  - METHOD: "Cash" or "Bank Transfer" in muted text
  - RECORDED BY: staff name in small text
  - ACTIONS: Eye icon (view), Receipt icon (download PDF receipt), Trash icon (void — owner only, shows red)

Show 8 example rows mixing income (membership payments) and expenses (utilities, salaries, equipment).

Include one VOIDED row — grayed out with strikethrough text and a red "VOIDED" badge.

PAGINATION: Same style as members page.

MODAL — Record Payment:
- Two tabs at top: "Record Income" | "Record Expense" (tab switcher)
- Income form: Member search/select, Amount, Payment Method (Cash/Bank/Other), Description, Period Month+Year
- Expense form: Category (Salary/Equipment/Utilities/Other), Staff (for salary), Amount, Payment Method, Description, Period
- Footer: Cancel + Record Payment buttons

Feel should be like a fintech dashboard — numbers clearly readable, direction of money flow instantly obvious.
```

---

## 6. STAFF MANAGEMENT PAGE

```
Design a premium dark-themed staff management page for "GymX" gym management system. This page is OWNER-ONLY and manages all gym employees.

DESIGN SYSTEM:
- Background: #0a0e1a, Cards: #1a1f35, Borders: #1e293b
- Role colors: Owner = gradient (blue-cyan), Receptionist = blue #3b82f6, Trainer = green #22c55e
- Font: Inter

LAYOUT: Left sidebar + top bar + main content.

TOP BAR:
- Title: "Staff Management"
- Right: "Add Staff" blue gradient button with UserPlus icon

STATS ROW (3 small stat cards):
1. "Total Staff" — value "8", icon Users
2. "Active" — value "7", green accent, icon UserCheck
3. "Trainers" — value "4", cyan accent, icon Dumbbell

STAFF TABLE (card):
- Columns: NAME, USERNAME, ROLE, PHONE, STATUS, SALARY, LAST LOGIN, ACTIONS
- Each row:
  - NAME: Full name bold, small avatar circle with initials (colored by role)
  - USERNAME: "dawit@gym.com" in muted
  - ROLE: Pill badge — "owner" with gradient bg, "receptionist" blue bg, "trainer" green bg
  - PHONE: phone number
  - STATUS: green dot + "Active" or gray dot + "Inactive"
  - SALARY: "5,000 ETB/mo" (only for trainers and receptionists)
  - LAST LOGIN: "2 hours ago" or "May 6, 2026"
  - ACTIONS: Edit icon, Key icon (change password), Toggle icon (activate/deactivate)

Show 6 example rows:
- Biruh Tesfaye (owner), Dawit Alemu (trainer), Hana Girma (receptionist), Yonas Tadesse (trainer), Meron Hailu (trainer), Abebe Bekele (receptionist)

MODAL — Add Staff:
- Fields: Full Name, Email, Phone, Role (select: Receptionist/Trainer), Initial Password, Salary Amount, Payment Day
- For Trainer role: additional "Specialization" field and schedule checkboxes (Mon-Sun)
- Footer: Cancel + Create Staff Account buttons

MODAL — Change Password:
- Current Password (if changing own), New Password, Confirm Password
- Footer: Cancel + Update Password

The page should convey authority and control — this is the admin's power panel.
```

*Part 2 is in the next file — STITCH_PROMPTS_PART2.md*
