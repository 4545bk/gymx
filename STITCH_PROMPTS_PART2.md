# GymX — Google Stitch UI Design Prompts (Part 2)

> Continuation of STITCH_PROMPTS_PART1.md — Pages 7-14

---

## 7. INVENTORY (Equipment) PAGE

```
Design a premium dark-themed gym equipment inventory page for "GymX" gym management system. This tracks physical gym equipment and their maintenance schedules.

DESIGN SYSTEM:
- Background: #0a0e1a, Cards: #1a1f35, Borders: #1e293b
- Condition colors: Good = #22c55e, Fair = #f59e0b, Needs Repair = #ef4444, Retired = #64748b
- Font: Inter, currency: ETB

LAYOUT: Left sidebar (260px) + top bar + main content.

TOP BAR:
- Title: "Equipment Inventory"
- Right: "Add Equipment" blue gradient button with Plus icon

FILTER BAR:
- Category dropdown: All / Cardio / Strength / Free Weights / Other
- Condition dropdown: All / Good / Fair / Needs Repair / Retired
- "Maintenance Due" toggle button — when active, shows only items with upcoming maintenance

EQUIPMENT GRID (card grid layout, 3 columns):
Each equipment card:
- Card bg: #1a1f35, border: #1e293b, radius: 16px
- Top: Equipment icon or category icon (Dumbbell for strength, Heart for cardio)
- Name: "Treadmill" (bold, 1.1rem)
- Brand: "Life Fitness" (muted, 0.85rem)
- Serial: "LF-TM-2024-009" (tiny, muted)
- Quantity: "Qty: 6" badge
- Condition badge: pill — "GOOD" green, "FAIR" amber, "NEEDS REPAIR" red pulsing
- Maintenance section (bottom of card):
  - "Last Service: Mar 1, 2026" (small muted)
  - "Next Service: Sep 1, 2026" (small)
  - If within 30 days: amber warning icon + "Due in 25 days"
- Hover: lift with shadow

Show 6 equipment cards:
1. Treadmill — Life Fitness — Qty 6 — Good — Next service Sep 2026
2. Bench Press — Rogue — Qty 4 — Good
3. Rowing Machine — Concept2 — Qty 3 — Fair — "Due in 12 days" amber warning
4. Leg Press — Hammer Strength — Qty 2 — Needs Repair — red warning
5. Dumbbells Set — York — Qty 20 — Good
6. Spin Bike — Keiser — Qty 8 — Good

MODAL — Add Equipment:
- Fields: Name, Category (select), Brand, Serial Number, Quantity, Condition (select), Purchase Date, Purchase Cost (ETB), Vendor, Maintenance Interval (months)
- Footer: Cancel + Add Equipment

MODAL — Log Maintenance:
- "Log Service for: Treadmill" title
- Service Date (date picker), Notes textarea ("Belt replaced, calibrated speed sensors")
- Footer: Cancel + Log Service

Clean, organized, at-a-glance condition monitoring.
```

---

## 8. ALERTS PAGE

```
Design a premium dark-themed alerts/notifications page for "GymX" gym management system. This shows system-generated alerts for the owner and receptionist.

DESIGN SYSTEM:
- Background: #0a0e1a, Cards: #1a1f35, Borders: #1e293b
- Severity: info=#3b82f6, warning=#f59e0b, critical=#ef4444
- Font: Inter

LAYOUT: Left sidebar + top bar + main content.

TOP BAR:
- Title: "Alerts"
- Right: Unread count badge "7 unread" + "Mark All Read" ghost button

FILTER TABS (horizontal, pill-style):
- All (active) | Unread | Membership | Maintenance | Payment

ALERTS LIST (vertical stack of alert cards):
Each alert card:
- Card with left colored accent border (3px) based on severity
- Warning = amber left border, Critical = red left border, Info = blue left border
- Layout: icon on left, content in center, actions on right
- Icon: colored circle with severity icon (AlertTriangle for warning, AlertCircle for critical, Info for info)
- Content:
  - Message: "Selam Tesfaye's membership expires in 3 days" (0.9rem, white)
  - Type badge: small pill — "membership-expiring" amber, "maintenance-due" blue, "payment-overdue" red
  - Timestamp: "May 3, 2026 — 2 days ago" (tiny, muted)
- Right side: "Mark Read" ghost button (checkmark icon), "Dismiss" ghost button (X icon, owner only)
- Unread cards have a subtle blue-ish tint background and a small blue dot indicator

Show 7 example alerts:
1. ⚠️ WARNING: "Selam Tesfaye's membership expires in 3 days" — membership-expiring — unread
2. ⚠️ WARNING: "Treadmill #3 is due for service in 5 days" — maintenance-due — unread
3. 🔴 CRITICAL: "Abebe Girma's membership expired yesterday" — membership-expired — unread
4. ⚠️ WARNING: "5 members have overdue payments" — payment-overdue — unread
5. ℹ️ INFO: "Meron Hailu's plan renewed successfully" — membership-renewed — read (dimmer)
6. ⚠️ WARNING: "Rowing Machine maintenance overdue by 3 days" — maintenance-due — unread
7. ℹ️ INFO: "Monthly expiry sync completed — 12 members marked expired" — system — read

EMPTY STATE (when no alerts):
- Large bell icon (muted, 48px)
- "All caught up!" heading
- "No unread alerts" subtitle

Read alerts should appear dimmer/grayed out compared to unread ones.
```

---

## 9. REPORTS & ANALYTICS PAGE

```
Design a premium dark-themed analytics and reports page for "GymX" gym management system. This page has three report tabs with charts and data.

DESIGN SYSTEM:
- Background: #0a0e1a, Cards: #1a1f35, Borders: #1e293b
- Chart colors: Blue #3b82f6, Cyan #06b6d4, Green #22c55e, Amber #f59e0b, Red #ef4444
- Font: Inter, currency: ETB

LAYOUT: Left sidebar + top bar + main content.

TOP BAR:
- Title: "Reports & Analytics"

TAB SWITCHER (3 tabs, pill style):
- Attendance | Revenue | Members (Attendance is active by default)

DATE RANGE PICKER:
- "From" date input + "To" date input + "Group by" dropdown (Day / Week / Month)
- "Generate Report" blue button

--- TAB 1: ATTENDANCE REPORT ---

SUMMARY STATS ROW (4 cards):
1. "Total Check-ins" — value "2,847" — CalendarCheck icon
2. "Daily Average" — value "91" — TrendingUp icon
3. "Peak Day" — value "134" with date "May 6" — Zap icon
4. "Denied Entries" — value "43" — ShieldX icon, red accent

CHART AREA (large card, full width):
- Area/Bar chart showing daily check-ins over the selected period
- Two series: "Granted" (green filled area) and "Denied" (red bars on top)
- X-axis: dates, Y-axis: count
- Smooth curves, subtle grid lines in #1e293b
- Tooltip on hover showing exact values
- Chart style: Recharts-compatible, dark theme with transparent backgrounds

DENIAL BREAKDOWN (card, half width):
- Horizontal bar chart or donut chart:
  - Expired: 18 (red)
  - Wrong Day: 14 (amber)
  - Duplicate: 11 (blue)
- Each bar has the label, count, and percentage

--- TAB 2: REVENUE REPORT (show as reference) ---

SUMMARY: Total Income, Total Expenses, Net Profit, Membership Count
CHART: Grouped bar chart — Income (green) vs Expenses (red) by month
- 5-month view: Jan-May 2026
- Each month shows two bars side by side

--- TAB 3: MEMBERS REPORT (show as reference) ---

SUMMARY: Total Active, Expired, Suspended, New This Month, Churned
CHARTS:
- Donut chart: member distribution by status (active/expired/suspended/frozen)
- Donut chart: distribution by plan type (full-week/3-day/weekend)
- Bar chart: "Expiring Soon" — members expiring in 7 days vs 30 days

All charts should use the dark theme — dark backgrounds, colored data series, subtle grid lines, no white backgrounds. The feel should be like a premium Datadog or Grafana dashboard.
```

---

## 10. DUES TRACKING PAGE

```
Design a premium dark-themed membership dues tracking page for "GymX" gym management system. This tracks which members owe money.

DESIGN SYSTEM:
- Background: #0a0e1a, Cards: #1a1f35, Borders: #1e293b
- Payment status: PAID=#22c55e, PARTIAL=#f59e0b, UNPAID=#ef4444, OVERDUE=#dc2626
- Font: Inter, currency: ETB

LAYOUT: Left sidebar + top bar + main content.

TOP BAR:
- Title: "Membership Dues"

OVERVIEW CARDS (4 columns):
1. "Paid Members" — green accent, value "198", Wallet icon
2. "Partial Payments" — amber accent, value "24", with outstanding "12,400 ETB"
3. "Unpaid Members" — red accent, value "67", with outstanding "53,600 ETB"
4. "Overdue" — dark red accent, value "14", pulsing warning, outstanding "11,200 ETB"

FILTER BAR:
- Payment Status tabs: All | Paid | Partial | Unpaid | Overdue
- Search input for member name

DUES TABLE (card):
- Columns: MEMBER, PLAN, TOTAL DUE, PAID, REMAINING, STATUS, ACTIONS
- Each row:
  - MEMBER: name bold + MBR-ID tiny muted
  - PLAN: "Full Week — 800 ETB/mo"
  - TOTAL DUE: "800 ETB"
  - PAID: "500 ETB" (green text if fully paid, amber if partial)
  - REMAINING: "300 ETB" (red text if > 0)
  - STATUS: colored pill badge
  - ACTIONS: "Record Payment" small button (blue), "View History" ghost button

Show 8 rows with mix of statuses.

MODAL — Record Dues Payment:
- Header: "Record Payment — Selam Tesfaye"
- Shows: Total Due 800 ETB, Already Paid 500 ETB, Remaining 300 ETB (highlighted)
- Amount input (pre-filled with remaining balance)
- Payment Method select
- Note textarea
- Warning if amount exceeds remaining: "Amount exceeds remaining balance"
- Footer: Cancel + Record Payment

MODAL — Payment History:
- List of past payments for a member with dates, amounts, and running balance
```

---

## 11. PRODUCTS (POS Catalog) PAGE

```
Design a premium dark-themed product catalog page for "GymX" gym management system. This manages gym shop products (supplements, drinks, accessories).

DESIGN SYSTEM:
- Background: #0a0e1a, Cards: #1a1f35, Borders: #1e293b
- Low stock warning: #f59e0b, Out of stock: #ef4444
- Category colors: supplements=#8b5cf6 purple, drinks=#06b6d4 cyan, accessories=#f59e0b amber, merchandise=#ec4899 pink
- Font: Inter, currency: ETB

LAYOUT: Left sidebar + top bar + main content.

TOP BAR:
- Title: "Products"
- Right: "Add Product" gradient button, "Low Stock (3)" amber warning badge button

FILTER BAR:
- Search input
- Category dropdown: All / Supplements / Drinks / Accessories / Merchandise
- Status toggle: Active | Archived

PRODUCTS TABLE (card):
- Columns: PRODUCT, SKU, CATEGORY, COST, PRICE, STOCK, MARGIN, ACTIONS
- Each row:
  - PRODUCT: Name bold + description subtitle muted
  - SKU: "PRD-001" monospace small
  - CATEGORY: colored pill badge by category
  - COST: "150 ETB" muted
  - PRICE: "250 ETB" bold
  - STOCK: number + if below threshold, amber "LOW" badge with warning icon
  - MARGIN: calculated percentage "40%" in green
  - ACTIONS: Edit, Adjust Stock (±), Archive

Show 6 products:
1. Whey Protein 1kg — supplements — 2,500 ETB — Stock: 12
2. Energy Drink (Red Bull) — drinks — 80 ETB — Stock: 3 ⚠️ LOW
3. Gym Gloves — accessories — 350 ETB — Stock: 8
4. Branded T-Shirt — merchandise — 450 ETB — Stock: 0 🔴 OUT
5. BCAA Capsules — supplements — 600 ETB — Stock: 15
6. Water Bottle — drinks — 25 ETB — Stock: 45

MODAL — Adjust Stock:
- Product name shown
- Current stock display
- Adjustment type: Restock / Damage / Correction
- Quantity input (+ or -)
- Note field
```

---

## 12. SALES (POS) PAGE

```
Design a premium dark-themed point-of-sale and sales history page for "GymX" gym management system.

DESIGN SYSTEM:
- Background: #0a0e1a, Cards: #1a1f35, Borders: #1e293b, Accent: blue-cyan gradient
- Font: Inter, currency: ETB

LAYOUT: Left sidebar + top bar + main content.

TOP BAR:
- Title: "Sales"
- Right: "New Sale" blue gradient button with ShoppingCart icon

STATS ROW (3 cards):
1. "Today's Sales" — value "4,250 ETB" — green
2. "This Month" — value "87,400 ETB" — blue
3. "Items Sold Today" — value "12" — cyan

SALES HISTORY TABLE (card):
- Columns: SALE #, DATE, ITEMS, TOTAL, PAYMENT, SOLD BY, STATUS, ACTIONS
- Each row:
  - SALE #: "SLE-20260506-0001" monospace
  - DATE: "May 6, 2026 09:22 AM"
  - ITEMS: "3 items" with expand to see detail
  - TOTAL: "1,250 ETB" bold
  - PAYMENT: "Cash" or "Bank Transfer"
  - SOLD BY: staff name
  - STATUS: "Completed" green badge or "VOIDED" red badge with strikethrough
  - ACTIONS: View, Receipt (download PDF), Void (red, owner only)

MODAL — New Sale (POS Interface):
- Left side (60%): Product search + product grid/list
  - Search bar for products
  - Product cards showing name, price, stock available
  - Click to add to cart
- Right side (40%): Cart
  - Cart items: product name, qty (+ / -), unit price, line total
  - Subtotal
  - Discount input (ETB amount)
  - TOTAL (large, bold, gradient text)
  - Payment Method selector
  - Notes field
  - "Complete Sale" large gradient button

The POS modal should feel like a modern retail checkout system.
```

---

## 13. SETTINGS PAGE

```
Design a premium dark-themed settings page for "GymX" gym management system. Owner-only admin configuration page.

DESIGN SYSTEM:
- Background: #0a0e1a, Cards: #1a1f35, Borders: #1e293b
- Font: Inter

LAYOUT: Left sidebar + top bar + main content.

TOP BAR:
- Title: "Settings"

SETTINGS SECTIONS (vertical stack of cards):

CARD 1 — "Gym Identity":
- Gym Name: text input (value "GymX")
- Tagline: text input
- Phone: text input
- Email: text input
- Address: textarea
- "Save Changes" button

CARD 2 — "Membership Plans":
- Table of active plans: Name, Type, Duration, Price, Status, Actions (edit/deactivate)
- Plans:
  - Full Week — full-week — 1 month — 800 ETB — Active
  - 3-Day Plan — 3-day — 1 month — 500 ETB — Active
  - Weekend Plan — weekend — 1 month — 400 ETB — Active
- "Add Plan" button below table

CARD 3 — "System Defaults":
- Default Currency: ETB (select)
- Timezone: Africa/Addis_Ababa (select)
- Low Stock Threshold: number input (default 5)
- Dashboard Refresh Interval: number input (seconds)

CARD 4 — "Backup & Restore" (with caution styling):
- Last backup info: "Last backup: May 10, 2026 by Biruh Tesfaye"
- "Download Backup" blue button — exports all 12 collections as JSON
- Divider with warning styling
- "Restore from Backup" section with file upload area (drag & drop zone)
- Two-step: Upload → Validate → Confirm restore
- Red warning text: "This will replace all existing data"

CARD 5 — "Audit Log" (link):
- Brief description + "View Audit Log" button that links to /audit page

Overall feel: organized, clear, admin-power-user interface with careful destructive action warnings.
```

---

## 14. ATTENDANCE HISTORY PAGE

```
Design a premium dark-themed attendance history page for "GymX" gym management system. This shows historical check-in records with date filtering.

DESIGN SYSTEM:
- Background: #0a0e1a, Cards: #1a1f35, Borders: #1e293b
- Granted: #22c55e, Denied: #ef4444, Duplicate: #f59e0b
- Font: Inter

LAYOUT: Left sidebar + top bar + main content.

TOP BAR:
- Title: "Attendance History"

FILTER BAR:
- Date range: "From" date picker + "To" date picker
- Result filter: All / Granted / Denied
- Member search input
- "Search" blue button

STATS SUMMARY (3 small cards inline):
1. Total Records — value "2,847"
2. Granted — value "2,804" green
3. Denied — value "43" red (with breakdown: "18 expired, 14 wrong-day, 11 duplicate")

ATTENDANCE TABLE (card):
- Columns: DATE, TIME, MEMBER, PLAN, RESULT, DENY REASON
- Each row:
  - DATE: "May 6, 2026"
  - TIME: "07:34 AM"
  - MEMBER: Name bold + MBR-ID tiny
  - PLAN: "3-day" or "full-week"
  - RESULT: Green "GRANTED" badge or Red "DENIED" badge
  - DENY REASON: only for denied — "expired", "wrong-day", "duplicate" in muted text

Show 12 example rows, mostly granted with 2-3 denied entries scattered.

PAGINATION: standard dark theme pagination bar.

The page should be simple, scannable, and focused on the data table.
```

---

## DESIGN NOTES FOR ALL PAGES

When pasting any of these prompts into Google Stitch, keep these universal rules:

1. **Dark theme only** — no white backgrounds anywhere
2. **Inter font** — use Google Font Inter for all text
3. **Consistent spacing** — 16px padding in cards, 10px border-radius on inputs, 16-20px on cards
4. **Status badges** — always pill-shaped (border-radius: 9999px), uppercase, tiny text, colored background at 10% opacity with solid text color
5. **All monetary values in ETB** — formatted with commas (e.g., "163,000 ETB")
6. **Ethiopian names** for sample data
7. **Icons** — use Lucide icon style (thin, consistent stroke width)
8. **Hover states** — subtle lift (translateY -2px) with deeper shadow on cards
9. **The sidebar is identical on every page** — only the active nav item changes
