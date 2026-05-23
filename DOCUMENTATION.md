# GymX — Complete Platform Documentation

> **Version:** 1.0.0 | **Last Updated:** May 2026
> Full-stack gym management system built for Ethiopian gym businesses.

---

## Table of Contents

1. [Technology Stack](#1-technology-stack)
2. [Architecture Overview](#2-architecture-overview)
3. [Project Structure](#3-project-structure)
4. [Database Design](#4-database-design)
5. [Authentication & Security](#5-authentication--security)
6. [API Reference](#6-api-reference)
7. [Frontend Pages](#7-frontend-pages)
8. [Feature Modules](#8-feature-modules)
9. [Background Jobs](#9-background-jobs)
10. [Configuration & Environment](#10-configuration--environment)
11. [Running the Application](#11-running-the-application)

---

## 1. Technology Stack

### Backend
| Technology | Version | Purpose |
|---|---|---|
| **Node.js** | ≥18.0 | Runtime |
| **Express** | 4.21 | HTTP framework |
| **MongoDB** | 8.x (Mongoose) | Primary database |
| **Redis** (ioredis) | 5.4 | Session cache, check-in hot path |
| **JWT** (jsonwebtoken) | 9.0 | Access + refresh token auth |
| **Zod** | 3.23 | Request validation |
| **PDFKit** | 0.15 | Receipt & membership card PDF generation |
| **QRCode** | 1.5 | QR code generation |
| **node-cron** | 3.0 | Background job scheduling |
| **Helmet** | 7.1 | HTTP security headers |
| **bcrypt** | 5.1 | Password hashing |
| **Cloudinary** | ^2.10.0 | Image hosting & optimization CDN |


### Frontend
| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | 14.2 | React framework (App Router) |
| **React** | 18.3 | UI library |
| **Axios** | 1.7 | HTTP client with interceptors |
| **Recharts** | 2.12 | Dashboard charts |
| **Lucide React** | 0.400 | Icon library |
| **date-fns** | 3.6 | Date formatting |

### Infrastructure
| Component | Details |
|---|---|
| **Database** | MongoDB Atlas / local |
| **Cache** | Redis (local or cloud) |
| **Dev Server** | Backend :5000, Frontend :3001 |
| **Auth** | JWT access (15min) + HTTP-only refresh cookie (7d) |

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 14)                     │
│  Port 3001 | App Router | SSR + Client Components           │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │Dashboard │ │ Members  │ │ Finance  │ │   POS    │  ...    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│                      │ Axios + JWT                           │
└──────────────────────┼───────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND (Express 4.21)                     │
│  Port 5000 | /api/v1/* | 14 route modules                   │
│                                                              │
│  Middleware Chain:                                            │
│  Helmet → CORS → CookieParser → JSON(50MB) → Router → Error │
│                                                              │
│  ┌─────────┐  ┌───────────┐  ┌───────────┐  ┌────────────┐  │
│  │  Auth   │  │ Middleware │  │ Services  │  │ Controllers│  │
│  │JWT+RBAC │  │ validate  │  │ business  │  │ req/res    │  │
│  └─────────┘  │ roleGuard │  │ logic     │  └────────────┘  │
│               └───────────┘  └───────────┘                   │
│                      │              │                        │
│               ┌──────┴──────┐  ┌────┴────┐                   │
│               │  MongoDB    │  │  Redis  │                   │
│               │ 12 Models   │  │ Cache   │                   │
│               └─────────────┘  └─────────┘                   │
│                                                              │
│  Background: node-cron (04:00–04:15 daily)                   │
└─────────────────────────────────────────────────────────────┘
```

### Design Principles
- **Immutable financial records** — Payments and audit logs are never updated/deleted
- **Denormalized for speed** — Member payment summaries, billing embedded in member docs
- **Redis hot path** — QR check-in reads from cache first, falls back to MongoDB
- **Modular architecture** — Each feature is a self-contained module (service + controller + routes + validation)
- **RBAC everywhere** — Every endpoint is role-gated (owner / receptionist / trainer)

---

## 3. Project Structure

```
Gymx/
├── backend/
│   ├── package.json
│   ├── .env
│   └── src/
│       ├── server.js              # Entry point
│       ├── app.js                 # Express app setup
│       ├── routes.js              # Central API router
│       ├── config/
│       │   ├── env.js             # Environment validation
│       │   ├── db.js              # MongoDB connection
│       │   └── redis.js           # Redis connection + helpers
│       ├── middleware/
│       │   ├── auth.js            # JWT verification
│       │   ├── roleGuard.js       # RBAC middleware
│       │   ├── scannerAuth.js     # API key auth for QR scanner
│       │   ├── branchFilter.js    # Multi-branch scoping middleware
│       │   ├── validate.js        # Zod schema validation
│       │   └── errorHandler.js    # Global error handler
│       ├── models/                # 13 Mongoose schemas
│       │   ├── Member.js          # Core member document
│       │   ├── Staff.js           # Staff/user accounts
│       │   ├── Attendance.js      # Check-in records
│       │   ├── Payment.js         # Immutable payment ledger
│       │   ├── Product.js         # Product catalog
│       │   ├── Sale.js            # POS sale transactions
│       │   ├── InventoryMovement.js # Stock movement log
│       │   ├── Inventory.js       # Gym equipment tracking
│       │   ├── Alert.js           # System notifications
│       │   ├── AuditLog.js        # Immutable business event log
│       │   ├── Settings.js        # Singleton gym configuration
│       │   ├── MembershipPlan.js  # Dynamic membership plans
│       │   └── Branch.js          # Branch schema (multi-location)
│       ├── modules/               # 15 feature modules
│       │   ├── auth/              # Login, JWT, refresh tokens
│       │   ├── members/           # Member CRUD, QR, cards
│       │   ├── checkin/           # QR scan, SSE stream
│       │   ├── attendance/        # Attendance history
│       │   ├── staff/             # Staff management
│       │   ├── finance/           # Payment ledger, receipts
│       │   ├── dues/              # Membership billing tracking
│       │   ├── inventory/         # Gym equipment
│       │   ├── products/          # Product catalog + stock
│       │   ├── sales/             # POS + sale receipts
│       │   ├── alerts/            # Notifications
│       │   ├── reports/           # Analytics & summaries
│       │   ├── audit/             # Audit log viewer
│       │   ├── settings/          # Config, plans, backup
│       │   └── branches/          # Multi-location branches
│       ├── jobs/                  # Background cron jobs
│       │   ├── index.js           # Job scheduler
│       │   ├── cachePreWarm.js    # Redis pre-warm
│       │   ├── expirySync.js      # Membership expiry checker
│       │   └── maintenanceAlerts.js # Equipment alerts
│       ├── utils/
│       │   ├── receiptGenerator.js # PDF receipt templates
│       │   ├── qrGenerator.js     # QR code generation
│       │   ├── memberIdGenerator.js # MBR-XXXXXXXX IDs
│       │   ├── dateHelpers.js     # Date utilities
│       │   ├── sseManager.js      # Server-Sent Events
│       │   └── cloudinary.js      # Cloudinary upload utility
│       └── scripts/
│           ├── seed.js            # Database seed script
│           ├── seedDemo.js        # Mock data seed script
│           ├── migrateBranches.js # Branch data backfill migration
│           └── migrateDues.js     # Dues status sync migration
│
└── frontend/
    ├── package.json
    ├── next.config.js
    ├── app/
    │   ├── globals.css            # Design system (17KB)
    │   ├── layout.js              # Root layout
    │   ├── page.js                # Home redirect
    │   ├── login/page.js          # Login page
    │   ├── dashboard/page.js      # Main dashboard
    │   ├── members/page.js        # Member management
    │   ├── checkin/page.js        # QR check-in scanner
    │   ├── attendance/page.js     # Attendance history
    │   ├── staff/page.js          # Staff management
    │   ├── finance/page.js        # Financial ledger
    │   ├── dues/page.js           # Membership dues tracking
    │   ├── inventory/page.js      # Equipment management
    │   ├── products/page.js       # Product catalog
    │   ├── sales/page.js          # POS + sales history
    │   ├── alerts/page.js         # Notifications
    │   ├── reports/page.js        # Analytics
    │   └── settings/page.js       # Admin settings
    ├── components/
    │   ├── Sidebar.js             # Navigation sidebar
    │   └── ProtectedLayout.js     # Auth-wrapped layout
    └── lib/
        ├── api.js                 # Axios instance + interceptors
        ├── auth.js                # Auth context + hooks
        └── branchContext.js       # Branch context + hook
```

---

## 4. Database Design

### 4.1 Collections Overview

| Collection | Documents | Purpose | Mutable? |
|---|---|---|---|
| `members` | Core | Gym member profiles, plans, billing | Yes |
| `staffs` | Core | Staff accounts (owner/receptionist/trainer) | Yes |
| `attendances` | Hot | QR check-in log entries | Insert-only |
| `payments` | Financial | Immutable payment ledger | **Never** |
| `products` | Commerce | Product catalog with stock counts | Yes |
| `sales` | Commerce | POS sale transactions | Void-only |
| `inventorymovements` | Commerce | Stock adjustment history | Insert-only |
| `inventoryitems` | Operations | Gym equipment tracking | Yes |
| `alerts` | Operations | System notifications | Yes (read status) |
| `auditlogs` | Audit | Business event history | **Never** |
| `settings` | Config | Singleton gym configuration | Yes |
| `membershipplans` | Config | Dynamic membership plans | Yes |
| `branches` | Config | Gym branches (multi-location) | Yes |

### 4.2 Schema Details

#### Member (`members`)
```
memberId:         String (MBR-XXXXXXXX, unique)
fullName:         String
phone:            String (unique)
photoUrl:         String
emergencyContact: { name, phone }
qrCodeBase64:     String (select: false)
plan: {
  type:           '3-day' | 'full-week' | 'weekend' | 'custom'
  allowedDays:    [Number] (ISO weekday 1-7)
  startDate:      Date
  expiryDate:     Date
  durationMonths: Number
}
status:           'active' | 'expired' | 'suspended' | 'frozen'
paymentStatus:    'paid' | 'partial' | 'unpaid' | 'overdue'
billing: {
  totalDue:        Number (cents)
  amountPaid:      Number (cents)
  remainingBalance: Number (cents)
  lastPaymentDate: Date
  lastPaymentAmount: Number
  paymentCount:    Number
}
paymentSummary: { lastPaidDate, lastPaidAmount, outstandingBalance }
assignedTrainerId: ObjectId → Staff
card: {
  issuedAt:       Date
  printCount:     Number
  lastPrintedBy:  ObjectId → Staff
}
registeredBy:     ObjectId → Staff
branchId:         ObjectId → Branch (optional)
```
**Indexes:** `memberId` (unique), `phone` (unique), `fullName` (text), `plan.expiryDate + status`, `assignedTrainerId + status`, `paymentStatus + status`, `branchId + status`

#### Staff (`staffs`)
```
fullName:         String
phone:            String
email:            String (unique)
passwordHash:     String (bcrypt, select: false)
refreshTokenHash: String (select: false)
role:             'owner' | 'receptionist' | 'trainer'
trainerProfile: {
  specialization: String
  schedule:       { mon, tue, wed, thu, fri, sat, sun }
  assignedMemberCount: Number
}
salary: {
  amount:         Number (cents)
  currency:       String (default: 'ETB')
  paymentDay:     Number
}
status:           'active' | 'inactive'
assignedBranches: [ObjectId → Branch]
```
**Indexes:** `email` (unique), `role + status`

#### Attendance (`attendances`) — APPEND-ONLY
```
memberId:         String (matches Member.memberId)
memberRef:        ObjectId → Member
checkedInAt:      Date
date:             String (YYYY-MM-DD, UTC+3 local)
status:           'granted' | 'denied'
denyReason:       'expired' | 'suspended' | 'frozen' | 'wrong-day' | 'duplicate' | 'unknown-id' | null
planSnapshot:     { type, expiryDate }
branchId:         ObjectId → Branch (optional)
```
**Indexes:** `memberId + date` (unique compound index to prevent duplicate daily check-ins), `memberId + checkedInAt`, `date + checkedInAt`, `status + date`, `branchId + status`

#### Payment (`payments`) — IMMUTABLE
```
type:            'membership' | 'expense' | 'salary' | 'other'
direction:       'in' | 'out'
memberRef:       ObjectId → Member
memberName:      String (snapshot)
planType:        String (snapshot)
expenseCategory: 'salary' | 'equipment' | 'utilities' | 'other' | null
staffRef:        ObjectId → Staff (salary payments)
description:     String
amount:          Number (cents)
currency:        'ETB'
paymentMethod:   'cash' | 'bank-transfer' | 'other'
period:          { month, year }
voided:          Boolean
reversalOf:      ObjectId → Payment
recordedBy:      ObjectId → Staff
recordedAt:      Date
branchId:        ObjectId → Branch (optional)
```
**Indexes:** `memberRef + recordedAt`, `period.year + period.month + direction`, `direction + expenseCategory + recordedAt`, `recordedAt + direction`

#### Product (`products`)
```
name:             String
sku:              String (unique, auto-generated)
description:      String
category:         'supplements' | 'drinks' | 'accessories' | 'merchandise' | 'other'
costPrice:        Number (cents)
sellingPrice:     Number (cents)
stock:            Number
lowStockThreshold: Number
status:           'active' | 'archived'
isLowStock:       Boolean (virtual)
```

#### Sale (`sales`)
```
saleNumber:       String (SLE-YYYYMMDD-XXXX, unique)
items: [{
  productRef:     ObjectId → Product
  productName:    String (snapshot)
  sku:            String (snapshot)
  quantity:       Number
  unitPrice:      Number (cents)
  lineTotal:      Number (cents)
}]
subtotal:         Number (cents)
discount:         Number (cents)
total:            Number (cents)
paymentMethod:    'cash' | 'bank-transfer' | 'other'
soldBy:           ObjectId → Staff
soldByName:       String (snapshot)
saleDate:         Date
voided:           Boolean
voidedAt:         Date
voidedBy:         ObjectId → Staff
voidReason:       String
notes:            String
branchId:         ObjectId → Branch (optional)
```
**Indexes:** `saleDate`, `soldBy + saleDate`, `items.productRef`

#### InventoryMovement (`inventorymovements`) — APPEND-ONLY
```
productRef:       ObjectId → Product
productName:      String (snapshot)
sku:              String (snapshot)
type:             'initial' | 'restock' | 'sale' | 'correction' | 'return' | 'damaged' | 'archived'
quantityChange:   Number (positive = added, negative = removed)
stockBefore:      Number
stockAfter:       Number
reason:           String
saleRef:          ObjectId → Sale (optional)
performedBy:      ObjectId → Staff
performedByName:  String (snapshot)
createdAt:        Date
updatedAt:        Date
```
**Indexes:** `productRef + createdAt`, `type + createdAt`

#### Inventory (`inventoryitems`)
```
name:             String
category:         'Cardio' | 'Strength' | 'Free weights' | 'Accessories' | 'Other'
brand:            String
serialNumber:     String
quantity:         Number
condition:        'good' | 'fair' | 'needs-repair' | 'retired'
purchaseInfo: {
  date:           Date
  cost:           Number (cents)
  currency:       String (default: 'ETB')
  vendor:         String
}
maintenance: {
  lastServiceDate: Date
  nextServiceDate: Date
  intervalMonths:  Number
  notes:           String
}
createdBy:        ObjectId → Staff
createdAt:        Date
updatedAt:        Date
```
**Indexes:** `maintenance.nextServiceDate + condition`, `category + condition`

#### Alert (`alerts`)
```
type:             'membership-expiring' | 'membership-expired' | 'payment-overdue' | 'maintenance-due' | 'manual'
severity:         'info' | 'warning' | 'critical'
subjectType:      'member' | 'equipment' | 'staff'
subjectRef:       ObjectId (polymorphic ref)
subjectName:      String (snapshot)
message:          String
visibleTo:        ['owner' | 'receptionist']
isRead:           Boolean
readBy:           [ObjectId → Staff]
createdAt:        Date
expiresAt:        Date (TTL field)
```
**Indexes:** `expiresAt` (TTL index), `visibleTo + isRead + createdAt`

#### AuditLog (`auditlogs`) — IMMUTABLE
```
action:          Enum (PRODUCT_CREATED, SALE_COMPLETED, SETTINGS_UPDATED, BACKUP_CREATED, etc.)
entity:          'product' | 'sale' | 'settings' | 'plan' | 'backup'
entityRef:       ObjectId
entityName:      String
changes:         { before, after }
maxlength:       Mixed
performedBy:     ObjectId → Staff
performedByName: String
```

#### Settings (`settings`) — SINGLETON
```
gymId:                    'default' (unique)
gymName:                  String
tagline:                  String
logoUrl:                  String
phone:                    String
email:                    String
address:                  String
currency:                 'ETB'
timezone:                 'Africa/Addis_Ababa'
receiptFooter:            String
receiptShowQR:            Boolean
cardShowLogo:             Boolean
defaultLowStockThreshold: Number
dashboardRefreshSeconds:  Number
lastBackupAt:             Date
lastBackupBy:             String
```

#### MembershipPlan (`membershipplans`)
```
name:            String
slug:            String (unique)
type:            'full-week' | '3-day' | 'weekend' | 'custom'
durationMonths:  Number
allowedDays:     [Number]
price:           Number (cents)
status:          'active' | 'inactive'
sortOrder:       Number
createdBy:       ObjectId → Staff
```

#### Branch (`branches`)
```
name:            String
address:         String
phone:           String
gymId:           String
isActive:        Boolean
isHeadquarters:  Boolean
scannerApiKey:   String (unique, auto-generated token)
createdAt:       Date
updatedAt:       Date
```
**Indexes:** `gymId + isActive`

---ssories' | 'merchandise' | 'other'
costPrice:      Number (cents)
sellingPrice:   Number (cents)
stock:          Number
lowStockThreshold: Number
status:         'active' | 'archived'
isLowStock:     Boolean (virtual)
```

#### Sale (`sales`)
```
saleNumber:     String (SLE-YYYYMMDD-XXXX, unique)
items: [{
  productId:    ObjectId → Product
  productName:  String (snapshot)
  sku:          String (snapshot)
  quantity:     Number
  unitPrice:    Number (cents)
  lineTotal:    Number (cents)
}]
subtotal:       Number (cents)
discount:       Number (cents)
total:          Number (cents)
paymentMethod:  'cash' | 'bank-transfer' | 'other'
soldBy:         ObjectId → Staff
soldByName:     String (snapshot)
saleDate:       Date
voided:         Boolean
voidedBy:       ObjectId → Staff
voidReason:     String
notes:          String
```

#### AuditLog (`auditlogs`) — IMMUTABLE
```
action:          Enum (PRODUCT_CREATED, SALE_COMPLETED, SETTINGS_UPDATED, BACKUP_CREATED, etc.)
entity:          'product' | 'sale' | 'settings' | 'plan' | 'backup'
entityRef:       ObjectId
entityName:      String
changes:         { before, after }
metadata:        Mixed
performedBy:     ObjectId → Staff
performedByName: String
```

#### Settings (`settings`) — SINGLETON
```
gymId:           'default' (unique)
gymName:         String
tagline:         String
logoUrl:         String
phone:           String
email:           String
address:         String
currency:        'ETB'
timezone:        'Africa/Addis_Ababa'
receiptFooter:   String
receiptShowQR:   Boolean
cardShowLogo:    Boolean
defaultLowStockThreshold: Number
dashboardRefreshSeconds:  Number
lastBackupAt:    Date
lastBackupBy:    String
```

#### MembershipPlan (`membershipplans`)
```
name:            String
slug:            String (unique)
type:            'full-week' | '3-day' | 'weekend' | 'custom'
durationMonths:  Number
allowedDays:     [Number]
price:           Number (cents)
status:          'active' | 'inactive'
sortOrder:       Number
createdBy:       ObjectId → Staff
```

---

## 5. Authentication & Security

### Auth Flow
1. **Login** → POST `/api/v1/auth/login` with username/password
2. **Server** → Returns access token (15min) + sets HTTP-only refresh cookie (7d)
3. **Client** → Stores access token in memory, sends via `Authorization: Bearer <token>`
4. **Expiry** → Axios interceptor auto-calls `/auth/refresh` to get new access token
5. **Logout** → Clears cookie + client memory

### RBAC Matrix

| Feature | Owner | Receptionist | Trainer |
|---|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ |
| Members (view) | ✅ | ✅ | Own only |
| Members (create/edit) | ✅ | ✅ | ❌ |
| Check-in Scanner | ✅ | ✅ | ❌ |
| Finance | ✅ | ✅ (create only) | ❌ |
| Dues (view/pay) | ✅ | ✅ | ❌ |
| Dues (set amount) | ✅ | ❌ | ❌ |
| Products | ✅ | ✅ (view+stock) | ❌ |
| Sales POS | ✅ | ✅ | ❌ |
| Inventory | ✅ | ✅ (view) | ❌ |
| Reports | ✅ | ✅ | ❌ |
| Staff Management | ✅ | ❌ | ❌ |
| Settings | ✅ | ❌ | ❌ |
| Backup/Restore | ✅ | ❌ | ❌ |
| Audit Log | ✅ | ❌ | ❌ |

### Security Measures
- Passwords hashed with bcrypt (10 rounds)
- JWT secrets validated ≥ 32 characters on startup
- Helmet HTTP security headers
- CORS origin-locked in production
- HTTP-only secure cookies for refresh tokens
- API key auth for QR scanner (separate from JWT)
- Zod validation on all write endpoints

---

## 6. API Reference

Base URL: `/api/v1`

### Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | Public | Login with credentials |
| POST | `/auth/refresh` | Cookie | Refresh access token |
| POST | `/auth/logout` | JWT | Clear session |
| GET | `/auth/me` | JWT | Current user profile |

### Members (10 endpoints)
| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/members` | All | List with filters/search/pagination |
| POST | `/members` | O, R | Register new member |
| GET | `/members/:id` | All | Member detail + stats |
| PUT | `/members/:id` | O, R | Update personal info |
| PATCH | `/members/:id/plan` | O, R | Renew/change plan |
| PATCH | `/members/:id/status` | O, R | Suspend/freeze/reactivate |
| DELETE | `/members/:id` | O | Soft delete |
| GET | `/members/:id/qr` | O, R | QR code image |
| GET | `/members/:id/attendance` | All | Visit history |
| GET | `/members/:id/card` | O, R | Download membership card PDF |

### Check-in (3 endpoints)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/checkin` | API Key | QR scan check-in |
| GET | `/checkin/stream` | JWT | SSE real-time stream |
| GET | `/checkin/today` | JWT | Today's log |

### Finance (6 endpoints)
| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/payments` | O | List payments |
| POST | `/payments` | O, R | Record payment |
| GET | `/payments/summary` | O | Monthly P&L |
| GET | `/payments/:id` | O | Payment detail |
| GET | `/payments/:id/receipt` | O, R | Download receipt PDF |
| DELETE | `/payments/:id` | O | Void payment |

### Dues (5 endpoints)
| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/dues/overview` | O, R | Dashboard summary |
| GET | `/dues/members` | O, R | Members by payment status |
| POST | `/dues/pay` | O, R | Record dues payment |
| PUT | `/dues/:id/set` | O | Set total due |
| GET | `/dues/:id/history` | O, R | Payment history |

### Products (8 endpoints)
| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/products` | O, R | List products |
| GET | `/products/low-stock` | O, R | Low stock alerts |
| GET | `/products/movements` | O | All stock movements |
| POST | `/products` | O | Create product |
| GET | `/products/:id` | O, R | Product detail |
| PUT | `/products/:id` | O | Update product |
| PATCH | `/products/:id/stock` | O, R | Adjust stock |
| PATCH | `/products/:id/archive` | O | Archive product |

### Sales (5 endpoints)
| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/sales` | O, R | List sales |
| GET | `/sales/analytics` | O | Sales analytics |
| POST | `/sales` | O, R | Create sale (POS) |
| GET | `/sales/:id` | O, R | Sale detail |
| GET | `/sales/:id/receipt` | O, R | Download receipt PDF |
| PATCH | `/sales/:id/void` | O | Void sale |

### Settings (10 endpoints)
| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/settings` | O | Get settings |
| PUT | `/settings` | O | Update settings |
| GET | `/settings/plans` | O | List all plans |
| GET | `/settings/plans/active` | O | Active plans only |
| POST | `/settings/plans` | O | Create plan |
| PUT | `/settings/plans/:id` | O | Update plan |
| DELETE | `/settings/plans/:id` | O | Deactivate plan |
| POST | `/settings/backup` | O | Download backup JSON |
| POST | `/settings/restore/validate` | O | Validate backup file |
| POST | `/settings/restore` | O | Restore from backup |

### Branches (5 endpoints)
| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/branches/count` | All | Count active branches |
| GET | `/branches` | O | List all branches (supports ?active=true) |
| POST | `/branches` | O | Create a new branch |
| PUT | `/branches/:id` | O | Update branch details |
| POST | `/branches/:id/regenerate-key` | O | Regenerate branch scanner API key |

### Other
| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/attendance` | O, R | Attendance history |
| GET | `/staff` | O | List staff |
| POST | `/staff` | O | Create staff |
| GET | `/inventory` | O, R | Equipment list |
| POST | `/inventory` | O | Add equipment |
| GET | `/alerts` | O, R | List alerts |
| GET | `/alerts/count` | O, R | Unread count |
| PATCH | `/alerts/:alertId/read` | O, R | Mark alert as read |
| DELETE | `/alerts/:alertId` | O | Dismiss alert |
| GET | `/reports/members` | O, R | Member stats |
| GET | `/reports/attendance` | O, R | Attendance report |
| GET | `/reports/revenue` | O | Revenue report |
| GET | `/audit` | O | Audit log |

---

## 7. Frontend Pages

| Route | Page | Description |
|---|---|---|
| `/login` | Login | Username/password authentication |
| `/dashboard` | Dashboard | Stats cards, recent check-ins, member breakdown, dues alerts |
| `/members` | Members | Searchable table, filters, QR, card download, payment status badges |
| `/checkin` | Check-In | QR scanner interface, real-time SSE feed |
| `/attendance` | Attendance | Date-range attendance history |
| `/staff` | Staff | Staff management (owner only) |
| `/finance` | Finance | Income/expense ledger, P&L, receipt download |
| `/dues` | Dues | Outstanding dues overview, payment recording, history |
| `/inventory` | Inventory | Equipment tracking, maintenance logs |
| `/products` | Products | Product catalog, stock management |
| `/sales` | Sales | POS interface + sales history |
| `/alerts` | Alerts | System notifications |
| `/reports` | Reports | Analytics and charts |
| `/settings` | Settings | General config, plans, backup/restore |

### Navigation (Sidebar)
- **Overview:** Dashboard, Check-In Scanner
- **Management:** Members, Attendance, Staff
- **Operations:** Finance, Dues, Inventory, Alerts, Reports
- **Commerce:** Products, Sales
- **Admin:** Settings

---

## 8. Feature Modules

### 8.1 Member Management
- Registration with auto-generated MBR-XXXXXXXX IDs
- QR code generation for each member
- Printable PDF membership cards with QR, photo, and plan details (tracks print metadata including `issuedAt`, `printCount`, and `lastPrintedBy`)
- Plan types: full-week, 3-day, weekend, custom
- Status management: switching status between `active`, `suspended`, `frozen`, and `expired`
- Soft-deleting members (sets status to `expired` and retains their billing and visit logs)
- Plan renewal with billing reset
- Profile editing (updates personal details and assigns trainers)
- Text search by name, phone prefix search
- Auto-uploads base64 member photos to Cloudinary (if configured)

### 8.2 QR Check-In System
- Hardware scanner sends POST with memberId via API key auth
- Redis-first lookup (cache hit ~1ms) → MongoDB fallback
- Validates: membership active, plan not expired, allowed day (3-day plans)
- SSE real-time stream to receptionist dashboard
- Attendance records are insert-only

### 8.3 Financial Ledger
- Double-entry inspired: `direction: 'in' | 'out'`
- Immutable records — cancellations create reversal documents
- Monthly P&L aggregation by period `{ month, year }`
- Payment methods: cash, bank-transfer, other
- PDF receipt generation with QR verification codes

### 8.4 Membership Dues Tracking
- Payment status independent from membership access status
- States: PAID → PARTIAL → UNPAID → OVERDUE
- Partial payment support with running balance
- Overpayment prevention
- Background job auto-marks overdue members daily
- Dashboard overview cards with outstanding revenue totals

### 8.5 Product Sales & Inventory (POS)
- Product catalog with SKU auto-generation
- Atomic stock operations: `$inc` with `$gte` guard prevents overselling
- POS interface with cart, discount, payment method
- Sale void with automatic stock restoration
- Low stock alerts and threshold management
- Full inventory movement history (restock, sale, damage, correction)

### 8.6 Receipt & Invoice System
- On-demand PDF generation from immutable records
- Two templates: membership payment receipt, product sale receipt
- GymX branding, QR verification codes
- Voided sales show red "VOIDED" watermark
- Print-optimized (A4, B&W friendly)

### 8.7 System Settings & Backup
- Singleton settings document (gym identity, regional, branding, defaults)
- Dynamic membership plan configuration (replace hardcoded plans)
- Pure Node.js JSON backup (exports 12 collections)
- Validated restore with 2-step confirmation
- Full audit logging for all admin operations

### 8.8 Audit System
- 18 action types across 5 entity types
- Immutable insert-only collection
- Captures before/after state for every change
- Owner-only read access

### 8.9 Multi-Location / Branch Support
- GymX supports multi-location setups with individual branches.
- **Branch Schema**: Scopes data using an optional `branchId` reference on `members`, `payments`, `sales`, and `attendances` to maintain full backwards compatibility for single-branch gyms.
- **Branch Scope Middleware**: The `branchFilter` middleware inspects the `x-branch-id` request header. Owners see all branches unless filtered, whereas other staff are automatically scoped to their `assignedBranches`.
- **Branch QR Scanning**: Each branch maintains a unique `scannerApiKey` for its dedicated physical entrance door scanner, auto-assigning check-ins to that specific branch.
- **Branch Context**: The frontend `BranchProvider` keeps track of the active branch in `localStorage`, appending it to headers for all subsequent API requests.

### 8.10 Cloudinary CDN Integration
- GymX transitions from storing base64-encoded image files (like member photos and gym logos) directly in MongoDB blobs to hosting them on Cloudinary's CDN.
- **Automatic Upload**: If `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` are set in the backend environment variables, the system uploads base64 data URIs to Cloudinary on member/settings updates and saves the secure CDN URLs instead.
- **PDF Generation Support**: The PDF engine retrieves and renders images directly from Cloudinary URLs rather than handling raw base64 data, minimizing latency and memory overhead.

### 8.11 Dark / Light Theme Toggle
- A premium, persistent theme switcher enables users to toggle between dark and light modes.
- **Zero Flash On Load**: An inline script in the HTML layout reads the saved theme from `localStorage` (`gymx-theme`) and immediately sets the `data-theme` attribute on the root element before rendering, preventing any flash of incorrect theme style.
- **CSS Variable styling**: High-fidelity dark variables and glassmorphism styling are applied using the `[data-theme="dark"]` selector in the `globals.css` design system.

### 8.12 Offline & Network Resilience for QR Check-In
To prevent check-in failures during internet outages or backend downtime, GymX implements a comprehensive offline-first resilience architecture:
- **Offline Member Cache**: Active members' profiles, membership plan types, and expiry dates are synchronized from the backend and cached locally in browser IndexedDB (`offlineDB.js`).
- **Local QR Access Decisions**: If the backend is unreachable, the system automatically switches to offline verification, matching scanned QR codes against the local IndexedDB cache to make instant "Granted" or "Denied" decisions.
- **IndexedDB Sync Queue**: Offline check-in records are queued locally in IndexedDB.
- **Service Worker Background Sync**: A custom Service Worker (`sw.js`) intercepts synchronization triggers, utilizing the browser's native Background Sync API to automatically upload the queued check-ins once internet connectivity is restored.
- **Custom Fallback Polling Queue**: For browsers lacking Background Sync support, a robust polling fallback queue (`checkinQueue.js`) checks network status and retries uploading pending check-ins periodically.
- **Resilient SSE with Polling Fallback**: The live receptionist feed (`resilientSSE.js`) handles server-sent events with exponential backoff auto-reconnects, automatically falling back to HTTP GET polling of today's check-ins every 10s if the SSE stream is disconnected.
- **Receptionist Dashboard Banner & Indicators**: An amber status banner alerts staff when the system is offline, and a synchronization badge displays the count of unsynced offline records with a manual "Sync Now" trigger button.

---

## 9. Background Jobs

All jobs run in `Africa/Addis_Ababa` timezone via node-cron.

| Time | Job | Description |
|---|---|---|
| 04:00 | Cache Pre-Warm | Load active members into Redis |
| 04:05 | Maintenance Alerts | Check equipment maintenance schedules |
| 04:10 | Expiry Sync | Mark expired memberships, generate alerts |
| 04:15 | Overdue Detection | Mark unpaid/partial expired members as overdue |

---

## 10. Configuration & Environment

### Required Environment Variables
```env
# Database
MONGODB_URI=mongodb+srv://...

# Cache
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=<min 32 chars>
JWT_REFRESH_SECRET=<min 32 chars>
SCANNER_API_KEY=<api key for QR scanner>

# Cloudinary (Optional, enabled automatically when variables are present)
CLOUDINARY_CLOUD_NAME=<your cloudinary cloud name>
CLOUDINARY_API_KEY=<your cloudinary api key>
CLOUDINARY_API_SECRET=<your cloudinary api secret>

# API
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
PORT=5000
NODE_ENV=development
GYM_TIMEZONE=Africa/Addis_Ababa
```

### Default Seeded Data
- **Owner account:** Created via `npm run seed`
- **Membership plans:** Full Week (800 ETB), 3-Day (500 ETB), Weekend (400 ETB)
- **Settings:** Default GymX branding, ETB currency, Addis Ababa timezone

---

## 11. Running the Application

### Prerequisites
- Node.js ≥ 18
- MongoDB (Atlas or local)
- Redis (local or cloud)

### Backend
```bash
cd backend
npm install
cp .env.example .env   # Configure your variables
npm run seed           # Create owner account
npm run dev            # Start with --watch (port 5000)
```

### Frontend
```bash
cd frontend
npm install
npm run dev            # Start Next.js dev server (port 3001)
```

### Production
```bash
# Backend
cd backend && npm start

# Frontend
cd frontend && npm run build && npm start
```

---

## Currency Convention

All monetary values are stored in **cents** (smallest currency unit).
- 800.00 ETB = `80000` in the database
- Frontend converts: `(cents / 100).toFixed(2) + ' ETB'`
- This avoids floating-point precision issues.

---

## Key Architectural Patterns

| Pattern | Where Used |
|---|---|
| **Singleton Document** | Settings (one per gym) |
| **Immutable Ledger** | Payments, AuditLogs (never update/delete) |
| **Snapshot Fields** | memberName/planType on Payment, productName on Sale |
| **Soft Delete** | Members (status → expired), Products (archived) |
| **Void + Reversal** | Payments create reversal doc, Sales mark voided |
| **Cache-Aside** | Redis for check-in hot path |
| **Denormalization** | billing/paymentSummary embedded on Member |
| **Atomic Stock** | MongoDB `$inc` with `$gte` guard on Product.stock |
| **Background Jobs** | node-cron for expiry sync, overdue detection |
| **Multi-Branch Scoping** | `branchFilter` middleware scoping all database queries by `branchId` |
| **Cloud Storage CDN** | `cloudinary.js` uploading logo/photos to offload MongoDB binary storage |
| **Offline-First Queue** | IndexedDB (`offlineDB.js`) & Service Worker (`sw.js`) background sync for offline QR check-ins |
| **Resilient SSE Connection** | `resilientSSE.js` reconnecting with exponential backoff & falling back to HTTP polling |

---

*Built for Ethiopian gym businesses. Optimized for low-cost printing, ETB currency, and Africa/Addis_Ababa timezone.*
