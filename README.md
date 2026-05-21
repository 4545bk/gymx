# 🏋️ GymX — Gym Management System

<div align="center">

**A full-stack SaaS platform for gym operations management — member registration, QR check-in, financial tracking, inventory, staff management, and real-time analytics.**

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Redis](https://img.shields.io/badge/Redis-Upstash-DC382D?logo=redis&logoColor=white)](https://upstash.com)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![Deploy](https://img.shields.io/badge/Backend-Render-46E3B7?logo=render&logoColor=white)](https://render.com)
[![Deploy](https://img.shields.io/badge/Frontend-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Database Models](#-database-models)
- [Background Jobs](#-background-jobs)
- [Security](#-security)
- [Deployment](#-deployment)
- [Scripts](#-scripts)

---

## 🎯 Overview

GymX is a production-ready gym management platform designed for small-to-medium fitness centers. It handles the complete operational lifecycle — from member registration with QR code generation, to real-time check-in via mobile scanner, financial tracking with partial payment support, inventory management, and comprehensive reporting with exportable analytics.

**Live Production:**
- **Frontend:** Deployed on Vercel
- **Backend API:** Deployed on Render
- **Database:** MongoDB Atlas
- **Cache:** Upstash Redis

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│                  Next.js 14 (Vercel)                         │
│      React 18 · Tailwind CSS · Recharts · Lucide Icons       │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTPS (JWT Auth)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                     Backend API                              │
│               Express.js (Render)                            │
│   Helmet · CORS · Rate Limiting · Zod Validation · JWT       │
├──────────────┬──────────────────────┬───────────────────────┤
│  MongoDB     │      Redis           │   Background Jobs      │
│  Atlas       │      Upstash         │   node-cron            │
│  (Primary)   │   (Check-in Cache)   │  (Expiry/Alerts/Cache) │
└──────────────┴──────────────────────┴───────────────────────┘
                      ▲
                      │ API Key Auth (x-scanner-key)
┌─────────────────────┴───────────────────────────────────────┐
│              Mobile QR Scanner                               │
│         Camera → Decode QR → POST /checkin                   │
│         (HTTPS required for camera access)                   │
└─────────────────────────────────────────────────────────────┘
```

### Request Flow

1. **Check-in (hot path):** Scanner → API Key auth → Redis cache lookup → Grant/Deny → SSE broadcast
2. **Admin operations:** Browser → JWT auth → Role guard → Business logic → MongoDB → Redis invalidation
3. **Background:** node-cron → Expiry sync → Overdue marking → Maintenance alerts

---

## ✨ Features

### 👥 Member Management
- Register members with photo, plan selection, and emergency contact
- Auto-generated unique Member ID (`MBR-XXXXXXXX`)
- QR code generation for each member (downloadable + printable)
- Printable PDF membership ID card with photo and QR
- Member status lifecycle: `active` → `suspended` / `frozen` / `expired`
- Edit member info, change status with reason tracking
- Soft delete (sets to expired, preserves all history)
- Plan renewal with automatic reactivation

### 📱 QR Code Check-In
- Mobile-first QR scanner using device camera
- Sub-200ms check-in via Redis cache (hot path optimized)
- Real-time SSE (Server-Sent Events) dashboard feed
- Multi-rule validation: status, expiry, allowed days (3-day plans)
- API key authentication (separate from staff JWT)

### 💰 Financial Management
- Record payments (cash, bank transfer, other methods)
- Partial payment support with running balance tracking
- Quick "Record Payment" from Members page
- Payment history per member
- Revenue summaries and financial reporting
- Void payments (owner only)
- PDF receipt generation and download

### 📊 Dues & Billing
- Independent payment status tracking (`paid` / `partial` / `unpaid` / `overdue`)
- Automatic overdue detection via background job
- Dues overview dashboard with outstanding revenue totals
- Set/adjust total dues per member

### 👨‍💼 Staff Management
- Role-based access: **Owner** → **Receptionist** → **Trainer**
- Staff CRUD with status management (active/suspended/terminated)
- Password change and account security
- Trainer-member assignment and filtered views

### 📦 Inventory Management
- Track gym equipment and supplies
- Stock movement logging (additions/removals)
- Low-stock alerts with configurable thresholds
- Inventory valuation and cost tracking

### 🛒 Product & Sales (POS)
- Product catalog with pricing and stock management
- Point-of-sale transactions
- Sales history and reporting
- Multi-item sales support

### 📈 Reports & Analytics
- Dashboard with key metrics and charts (via Recharts)
- Member growth and retention analytics
- Revenue trends and financial summaries
- Attendance patterns and check-in analytics
- Exportable report data

### 🔔 Alerts System
- Membership expiry alerts (configurable days before)
- Low-stock inventory alerts
- Equipment maintenance reminders
- Real-time alert feed

### ⚙️ Settings & Administration
- Dynamic membership plan management (create/edit/delete plans)
- Gym profile settings (name, timezone, branding)
- Full database backup (JSON export)
- Database restore with validation
- Audit logging for critical operations

---

## 🛠 Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **Node.js 18+** | Runtime |
| **Express.js 4** | HTTP framework |
| **MongoDB + Mongoose 8** | Primary database & ODM |
| **Redis (ioredis)** | Check-in cache layer |
| **JWT (jsonwebtoken)** | Authentication (access + refresh tokens) |
| **Zod** | Request validation schemas |
| **Helmet** | Security headers |
| **bcrypt** | Password hashing |
| **node-cron** | Background job scheduler |
| **PDFKit** | PDF generation (cards, receipts) |
| **qrcode** | QR code generation |
| **date-fns** | Date manipulation with timezone support |

### Frontend
| Technology | Purpose |
|---|---|
| **Next.js 14** | React framework (App Router) |
| **React 18** | UI library |
| **Tailwind CSS** | Utility-first styling |
| **Recharts** | Data visualization / charts |
| **Lucide React** | Icon system |
| **Axios** | HTTP client with interceptors |
| **date-fns** | Date formatting |

### Infrastructure
| Service | Purpose |
|---|---|
| **Render** | Backend hosting (Node.js) |
| **Vercel** | Frontend hosting (Next.js) |
| **MongoDB Atlas** | Cloud database |
| **Upstash Redis** | Serverless Redis cache |

---

## 📁 Project Structure

```
GymX/
├── backend/
│   ├── src/
│   │   ├── app.js                    # Express app setup
│   │   ├── server.js                 # Server bootstrap (DB, Redis, Jobs)
│   │   ├── routes.js                 # API route mounting
│   │   ├── config/
│   │   │   ├── db.js                 # MongoDB connection
│   │   │   ├── redis.js              # Redis client + helpers
│   │   │   └── env.js                # Environment validation
│   │   ├── middleware/
│   │   │   ├── auth.js               # JWT authentication
│   │   │   ├── roleGuard.js          # Role-based authorization
│   │   │   ├── scannerAuth.js        # API key auth for QR scanner
│   │   │   ├── validate.js           # Zod schema validation
│   │   │   ├── rateLimiter.js        # Rate limiting
│   │   │   └── errorHandler.js       # Global error handler
│   │   ├── models/                   # Mongoose schemas (12 models)
│   │   │   ├── Member.js             # HOT collection — QR scan target
│   │   │   ├── Staff.js              # Users with roles
│   │   │   ├── Attendance.js         # Check-in records
│   │   │   ├── Payment.js            # Immutable payment ledger
│   │   │   ├── Inventory.js          # Equipment & supplies
│   │   │   ├── InventoryMovement.js  # Stock change audit trail
│   │   │   ├── Product.js            # POS catalog items
│   │   │   ├── Sale.js               # POS transactions
│   │   │   ├── Alert.js              # System notifications
│   │   │   ├── AuditLog.js           # Action audit trail
│   │   │   ├── MembershipPlan.js     # Dynamic plan definitions
│   │   │   └── Settings.js           # Gym configuration
│   │   ├── modules/                  # Feature modules (14 domains)
│   │   │   ├── auth/                 # Login, token refresh, logout
│   │   │   ├── members/              # CRUD, status, plan, QR, cards
│   │   │   ├── checkin/              # QR scan, SSE stream, today log
│   │   │   ├── attendance/           # Attendance history queries
│   │   │   ├── staff/                # Staff CRUD, password change
│   │   │   ├── finance/              # Payments, receipts, summaries
│   │   │   ├── dues/                 # Billing, payment tracking
│   │   │   ├── inventory/            # Stock management
│   │   │   ├── products/             # Product catalog
│   │   │   ├── sales/                # POS transactions
│   │   │   ├── alerts/               # Notification management
│   │   │   ├── reports/              # Analytics endpoints
│   │   │   ├── audit/                # Audit log queries
│   │   │   └── settings/             # Config, plans, backup/restore
│   │   ├── jobs/                     # Background cron jobs
│   │   │   ├── index.js              # Job scheduler
│   │   │   ├── expirySync.js         # Auto-expire memberships
│   │   │   ├── cachePreWarm.js       # Redis cache warming
│   │   │   └── maintenanceAlerts.js  # Equipment maintenance checks
│   │   ├── utils/
│   │   │   ├── cardGenerator.js      # PDF membership card builder
│   │   │   ├── receiptGenerator.js   # PDF payment receipt builder
│   │   │   ├── qrGenerator.js        # QR code generation
│   │   │   ├── memberIdGenerator.js  # Unique MBR-XXXXXXXX generator
│   │   │   ├── dateHelpers.js        # Timezone-aware date utilities
│   │   │   └── sseManager.js         # Server-Sent Events broadcaster
│   │   └── scripts/
│   │       ├── seed.js               # Initial owner account seed
│   │       └── seedDemo.js           # Demo data seeding
│   └── package.json
│
├── frontend/
│   ├── app/                          # Next.js App Router pages
│   │   ├── layout.js                 # Root layout + providers
│   │   ├── page.js                   # Landing / redirect
│   │   ├── globals.css               # Design system tokens + styles
│   │   ├── login/                    # Authentication page
│   │   ├── dashboard/                # Main dashboard with charts
│   │   ├── members/                  # Member management + modals
│   │   ├── checkin/                  # Real-time check-in monitor
│   │   ├── attendance/               # Attendance history
│   │   ├── dues/                     # Payment tracking
│   │   ├── staff/                    # Staff management
│   │   ├── finance/                  # Financial records
│   │   ├── inventory/                # Inventory management
│   │   ├── products/                 # Product catalog
│   │   ├── sales/                    # POS interface
│   │   ├── reports/                  # Analytics & exports
│   │   ├── alerts/                   # Notification center
│   │   └── settings/                 # Admin configuration
│   ├── components/
│   │   ├── ProtectedLayout.js        # Auth guard + sidebar wrapper
│   │   ├── Sidebar.js                # Navigation sidebar
│   │   └── Toast.js                  # Toast notification system
│   ├── lib/
│   │   ├── api.js                    # Axios instance + interceptors
│   │   ├── auth.js                   # Auth context + token management
│   │   └── offlineDB.js             # IndexedDB offline support
│   └── package.json
│
├── vercel.json                       # Vercel config (API proxy rewrites)
├── render.yaml                       # Render Blueprint (backend deploy)
├── .env.example                      # Environment variable template
└── README.md                         # ← You are here
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18.0.0
- **MongoDB** (local or [Atlas free tier](https://www.mongodb.com/atlas))
- **Redis** (local or [Upstash free tier](https://upstash.com))

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/Gymx.git
cd Gymx
```

### 2. Backend Setup

```bash
cd backend
npm install

# Create environment file
cp .env.example .env
# Edit .env with your MongoDB URI, Redis URL, and secrets
```

### 3. Seed the Owner Account

```bash
npm run seed
```

This creates the initial **owner** account using credentials from your `.env`:
- `SEED_OWNER_EMAIL` → default: `owner@gymx.com`
- `SEED_OWNER_PASSWORD` → default: `OwnerPass123!`

### 4. Start Backend

```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

Backend runs at `http://localhost:5000`

### 5. Frontend Setup

```bash
cd ../frontend
npm install
```

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

### 6. Start Frontend

```bash
npm run dev
```

Frontend runs at `http://localhost:3001`

### 7. Login

Navigate to `http://localhost:3001/login` and use the owner credentials from step 3.

---

## 🔐 Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `JWT_SECRET` | ✅ | Access token signing secret (32+ chars) |
| `JWT_REFRESH_SECRET` | ✅ | Refresh token signing secret (32+ chars) |
| `SCANNER_API_KEY` | ✅ | API key for QR scanner authentication |
| `PORT` | ❌ | Server port (default: `5000`) |
| `NODE_ENV` | ❌ | `development` or `production` |
| `GYM_TIMEZONE` | ❌ | IANA timezone (default: `Africa/Addis_Ababa`) |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ | Backend API base URL |

### Generate Secrets

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📡 API Reference

**Base URL:** `/api/v1`

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/login` | — | Login with email/password |
| `POST` | `/auth/refresh` | Cookie | Refresh access token |
| `POST` | `/auth/logout` | JWT | Logout + clear cookies |
| `GET` | `/auth/me` | JWT | Get current staff profile |

### Members

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/members` | Owner/Receptionist/Trainer | List with filters & pagination |
| `POST` | `/members` | Owner/Receptionist | Register new member |
| `GET` | `/members/:id` | Owner/Receptionist/Trainer | Get member profile |
| `PUT` | `/members/:id` | Owner/Receptionist | Update personal info |
| `PATCH` | `/members/:id/plan` | Owner/Receptionist | Renew or change plan |
| `PATCH` | `/members/:id/status` | Owner/Receptionist | Suspend / freeze / reactivate |
| `DELETE` | `/members/:id` | Owner | Soft delete (set to expired) |
| `GET` | `/members/:id/qr` | Owner/Receptionist | Get QR code image |
| `GET` | `/members/:id/attendance` | Owner/Receptionist/Trainer | Attendance history |
| `GET` | `/members/:id/card` | Owner/Receptionist | Download PDF membership card |
| `PUT` | `/members/:id/photo` | Owner/Receptionist | Upload/update member photo |

### Check-In

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/checkin` | API Key | QR scan check-in (hot path) |
| `GET` | `/checkin/stream` | JWT | SSE real-time check-in feed |
| `GET` | `/checkin/today` | JWT | Today's check-in log |

### Staff

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/staff` | Owner | List all staff |
| `POST` | `/staff` | Owner | Create staff account |
| `GET` | `/staff/:id` | Owner/Receptionist/Trainer | Get staff profile |
| `PUT` | `/staff/:id` | Owner | Update staff info |
| `PATCH` | `/staff/:id/status` | Owner | Change staff status |
| `PATCH` | `/staff/:id/password` | Authenticated | Change password |
| `GET` | `/staff/:id/members` | Owner/Receptionist/Trainer | Get assigned members |

### Finance (Payments)

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/payments` | Owner | List all payments |
| `POST` | `/payments` | Owner/Receptionist | Record payment |
| `GET` | `/payments/summary` | Owner | Financial summary |
| `GET` | `/payments/:id` | Owner | Payment details |
| `GET` | `/payments/:id/receipt` | Owner/Receptionist | Download PDF receipt |
| `DELETE` | `/payments/:id` | Owner | Void a payment |

### Dues (Billing)

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/dues/overview` | Owner/Receptionist | Dues dashboard summary |
| `GET` | `/dues/members` | Owner/Receptionist | Members by payment status |
| `POST` | `/dues/pay` | Owner/Receptionist | Record dues payment |
| `PUT` | `/dues/:id/set` | Owner | Set total due amount |
| `GET` | `/dues/:id/history` | Owner/Receptionist | Member payment history |

### Inventory

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/inventory` | Owner/Receptionist | List inventory items |
| `POST` | `/inventory` | Owner | Add new item |
| `PUT` | `/inventory/:id` | Owner | Update item |
| `DELETE` | `/inventory/:id` | Owner | Remove item |

### Products & Sales

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/products` | Owner/Receptionist | Product catalog |
| `POST` | `/products` | Owner | Create product |
| `PUT` | `/products/:id` | Owner | Update product |
| `DELETE` | `/products/:id` | Owner | Delete product |
| `GET` | `/sales` | Owner/Receptionist | Sales history |
| `POST` | `/sales` | Owner/Receptionist | Record sale |

### Reports

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/reports/dashboard` | Owner/Receptionist | Dashboard metrics |
| `GET` | `/reports/attendance` | Owner/Receptionist | Attendance analytics |
| `GET` | `/reports/revenue` | Owner | Revenue analytics |
| `GET` | `/reports/members` | Owner/Receptionist | Member analytics |

### Alerts

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/alerts` | Owner/Receptionist | List alerts |
| `PATCH` | `/alerts/:id/read` | Owner/Receptionist | Mark as read |
| `PATCH` | `/alerts/read-all` | Owner/Receptionist | Mark all as read |

### Settings

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/settings` | Owner | Get gym settings |
| `PUT` | `/settings` | Owner | Update settings |
| `GET` | `/settings/plans/active` | Any staff | Active plans (for registration) |
| `GET` | `/settings/plans` | Owner | All plans (active + inactive) |
| `POST` | `/settings/plans` | Owner | Create membership plan |
| `PUT` | `/settings/plans/:id` | Owner | Update plan |
| `DELETE` | `/settings/plans/:id` | Owner | Delete plan |
| `POST` | `/settings/backup` | Owner | Export full database backup |
| `POST` | `/settings/restore/validate` | Owner | Validate backup file |
| `POST` | `/settings/restore` | Owner | Restore from backup |

---

## 🗄 Database Models

| Model | Collection | Description |
|---|---|---|
| **Member** | `members` | Core entity — QR identity, plan, billing, status |
| **Staff** | `staffs` | Users with roles (owner/receptionist/trainer) |
| **Attendance** | `attendances` | Check-in records (granted/denied + reason) |
| **Payment** | `payments` | Immutable financial ledger |
| **Inventory** | `inventories` | Equipment and supply tracking |
| **InventoryMovement** | `inventorymovements` | Stock change audit trail |
| **Product** | `products` | POS product catalog |
| **Sale** | `sales` | POS transaction records |
| **Alert** | `alerts` | System notifications |
| **AuditLog** | `auditlogs` | Critical action audit trail |
| **MembershipPlan** | `membershipplans` | Dynamic plan definitions |
| **Settings** | `settings` | Gym configuration singleton |

### Key Indexes (Performance)

```
Member:   { memberId: 1 }                  — unique, primary hot-path
          { phone: 1 }                     — unique, duplicate check
          { fullName: 'text' }             — text search
          { plan.expiryDate: 1, status: 1 }— expiry alert queries
          { assignedTrainerId: 1, status: 1 }— trainer dashboard
          { paymentStatus: 1, status: 1 }  — dues tracking
```

---

## ⏰ Background Jobs

| Job | Schedule | Description |
|---|---|---|
| **Expiry Sync** | Every 6 hours | Auto-sets `active` members with expired plans to `expired` status |
| **Cache Pre-Warm** | Daily at midnight | Pre-loads active member data into Redis for fast check-in |
| **Maintenance Alerts** | Daily at 8 AM | Generates alerts for low-stock inventory and equipment maintenance |
| **Overdue Detection** | Daily | Marks `unpaid`/`partial` members with expired plans as `overdue` |

---

## 🔒 Security

- **JWT Authentication** with access tokens (15min) + HTTP-only refresh token cookies (7d)
- **Role-Based Access Control (RBAC):** Owner → Receptionist → Trainer
- **API Key** authentication for QR scanner (separate from JWT)
- **Helmet.js** security headers
- **Rate Limiting** on all API endpoints
- **Zod** request body validation on all write endpoints
- **bcrypt** password hashing (salt rounds: 12)
- **CORS** with credentials support
- **Soft deletes** — no member data is ever permanently deleted

---

## 🚢 Deployment

### Backend → Render

1. Connect your GitHub repo to [Render](https://render.com)
2. Render auto-detects `render.yaml` blueprint
3. Set environment variables in Render dashboard:
   - `MONGODB_URI` — MongoDB Atlas connection string
   - `REDIS_URL` — Upstash Redis URL
   - Secrets are auto-generated by the blueprint
4. Deploy — backend runs at `https://gymx-xxxx.onrender.com`

### Frontend → Vercel

1. Connect your GitHub repo to [Vercel](https://vercel.com)
2. Set root directory to `frontend/`
3. `vercel.json` handles API proxying to the Render backend
4. Deploy — frontend runs at your custom domain

### API Proxy Configuration (`vercel.json`)

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://gymx-xxxx.onrender.com/api/:path*"
    }
  ]
}
```

---

## 📜 Scripts

### Backend

```bash
npm start          # Start production server
npm run dev        # Start with auto-reload (--watch)
npm run seed       # Seed initial owner account
npm run seed:demo  # Seed demo data (members, payments, etc.)
```

### Frontend

```bash
npm run dev        # Start dev server (port 3001)
npm run build      # Production build
npm start          # Start production server (port 3000)
npm run scanner    # Start HTTPS scanner server (for mobile camera)
```

---

## 👥 Roles & Permissions

| Feature | Owner | Receptionist | Trainer |
|---|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ❌ |
| Members — View | ✅ | ✅ | ✅ (assigned only) |
| Members — Create/Edit | ✅ | ✅ | ❌ |
| Members — Delete | ✅ | ❌ | ❌ |
| Members — Status Change | ✅ | ✅ | ❌ |
| Members — Record Payment | ✅ | ✅ | ❌ |
| Check-In Monitor | ✅ | ✅ | ❌ |
| Staff Management | ✅ | ❌ | ❌ |
| Finance / Payments | ✅ | ✅ (create only) | ❌ |
| Inventory | ✅ | ✅ (view only) | ❌ |
| Reports | ✅ | ✅ (limited) | ❌ |
| Settings / Backup | ✅ | ❌ | ❌ |

---

## 📄 License

This project is proprietary software. All rights reserved.

---

<div align="center">
  <strong>Built with ❤️ for Ethiopian fitness centers</strong>
</div>
