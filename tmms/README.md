# TMMS — Transport & Mobility Management System
### GOVSERVE Platform

A full-stack digital platform for managing Public Utility Vehicles (PUVs), franchises, violations, routes, and compliance for Local Government Units (LGUs).

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Quick Start](#quick-start)
5. [Detailed Setup](#detailed-setup)
   - [1. Clone the Repository](#1-clone-the-repository)
   - [2. Staff/Admin Dashboard (apps/web)](#2-staffadmin-dashboard-appsweb)
   - [3. Driver/Operator Portal (apps/website)](#3-driveroperator-portal-appswebsite)
   - [4. AI Service (apps/ai-service)](#4-ai-service-appsai-service)
   - [5. Database Setup](#5-database-setup)
6. [Environment Configuration](#environment-configuration)
7. [Supabase Configuration](#supabase-configuration)
8. [Running the System](#running-the-system)
9. [User Roles & Portals](#user-roles--portals)
10. [Common Issues & Fixes](#common-issues--fixes)

---

## System Overview

TMMS is a **monorepo** with three main applications:

| App | Description | Port |
|-----|-------------|------|
| `apps/web` | Staff & Admin Dashboard | `http://localhost:5173` |
| `apps/website` | Driver & Operator Portal | `http://localhost:5175` |
| `apps/ai-service` | Python AI Backend (YOLOv8 CCTV) | `http://localhost:8001` |

**Database**: Supabase (PostgreSQL) — hosted at `https://repaixqtxgoynmlrpibi.supabase.co`

---

## Architecture

```
GOVSERVE/tmms/
├── apps/
│   ├── web/              ← Staff/Admin portal (React + Vite) — Port 5173
│   ├── website/          ← Driver/Operator portal (React + Vite) — Port 5175
│   └── ai-service/       ← Python FastAPI + YOLOv8 — Port 8001
├── packages/
│   └── database/
│       └── seed.sql      ← Database schema & seed data
└── README.md             ← This file
```

### Why Two Separate Portals?

The Staff/Admin (`apps/web`) and Driver/Operator (`apps/website`) portals run on **different ports** so they use **separate localStorage namespaces**. This allows a user to be logged in as both a Staff member and a Driver simultaneously in the same browser without session conflicts.

---

## Prerequisites

Make sure the following are installed on your machine:

| Dependency | Version | Download |
|------------|---------|---------|
| Node.js | v18+ | https://nodejs.org |
| npm | v9+ | (comes with Node.js) |
| Python | 3.10+ | https://python.org |
| Git | latest | https://git-scm.com |
| XAMPP (optional) | latest | https://apachefriends.org |

---

## Quick Start

Open **3 terminal windows** and run the following:

**Terminal 1 — Staff/Admin Dashboard:**
```bash
cd apps/web
npm install
npm run dev
# → Open http://localhost:5173
```

**Terminal 2 — Driver/Operator Portal:**
```bash
cd apps/website
npm install
npm run dev
# → Open http://localhost:5175
```

**Terminal 3 — AI Service:**
```bash
cd apps/ai-service
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
python main.py
# → Running at http://localhost:8001
```

---

## Detailed Setup

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd GOVSERVE/tmms
```

---

### 2. Staff/Admin Dashboard (apps/web)

This is the main dashboard for **Staff, Enforcers, and Admins**.

```bash
cd apps/web
npm install
```

**Environment file** — create `apps/web/.env`:
```env
# AI Service URL — change this if your AI backend runs on a different port
VITE_AI_SERVICE_URL=http://localhost:8001
```

> **Note:** Supabase credentials are already hardcoded in `apps/web/src/lib/supabase.ts`.  
> You do NOT need to add `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` to the `.env` file.

Start the development server:
```bash
npm run dev
# Dashboard available at http://localhost:5173
```

**Default login accounts** (after seeding the database):

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@tmms.gov.ph` | `admin123!` |
| Staff | `staff@tmms.gov.ph` | `staff123!` |
| Enforcer | `enforcer@tmms.gov.ph` | `enforcer123!` |

---

### 3. Driver/Operator Portal (apps/website)

This is the self-service portal for **Drivers and Operators** to register, view violations, manage profiles, etc.

```bash
cd apps/website
npm install
```

**Environment file** — create `apps/website/.env`:
```env
# AI Service URL
VITE_AI_SERVICE_URL=http://localhost:8001
```

> **Note:** Supabase credentials are already hardcoded in `apps/website/src/lib/supabase.ts`.  
> No additional `.env` configuration is needed for Supabase.

Start the development server:
```bash
npm run dev
# Portal available at http://localhost:5175
```

**Registration:** Drivers and Operators self-register at `http://localhost:5175/register`.  
An OTP will be sent to their email to verify the account.

---

### 4. AI Service (apps/ai-service)

The Python FastAPI backend handles:
- YOLOv8 vehicle detection from CCTV feeds
- License plate recognition
- Real-time violation detection (red-light, overspeeding, illegal parking)

```bash
cd apps/ai-service

# Create and activate virtual environment
python -m venv venv

# Windows:
venv\Scripts\activate

# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
python main.py
```

The AI service will be available at `http://localhost:8001`.

**API Endpoints:**
- `GET /health` — Health check
- `POST /detect` — Submit video frame for detection
- `GET /stream/{camera_id}` — WebSocket stream for live CCTV

---

### 5. Database Setup

The database runs on **Supabase** (PostgreSQL). The schema is already set up on the cloud instance.

To **seed** the database with sample data:

1. Open the Supabase Dashboard: https://app.supabase.com
2. Navigate to **SQL Editor**
3. Open and run `packages/database/seed.sql`

To apply **migrations** (if schema changes are needed):
1. Run `packages/database/migrate_audit_logs.sql` in the Supabase SQL Editor

---

## Environment Configuration

### Summary Table

| File | Variables Required | What It Controls |
|------|--------------------|-----------------|
| `apps/web/.env` | `VITE_AI_SERVICE_URL` | AI backend URL for Staff portal |
| `apps/website/.env` | `VITE_AI_SERVICE_URL` | AI backend URL for Driver/Operator portal |
| ~~`VITE_SUPABASE_URL`~~ | ❌ Not needed | Hardcoded in `supabase.ts` |
| ~~`VITE_SUPABASE_ANON_KEY`~~ | ❌ Not needed | Hardcoded in `supabase.ts` |

### apps/web/.env (minimal)
```env
VITE_AI_SERVICE_URL=http://localhost:8001
```

### apps/website/.env (minimal)
```env
VITE_AI_SERVICE_URL=http://localhost:8001
```

---

## Supabase Configuration

The Supabase project is already configured. Here's what was set up and why.

**Project URL:** `https://repaixqtxgoynmlrpibi.supabase.co`

### Authentication Settings

In Supabase Dashboard → **Authentication → Settings**:

| Setting | Value | Reason |
|---------|-------|--------|
| Enable email confirmations | OFF | We use our own OTP flow via `signInWithOtp` |
| OTP Expiry | 3600 seconds | 1 hour to enter the code |
| Minimum password length | 8 | Security requirement |

### OTP Email Flow

> **Important:** The system does NOT use Supabase's built-in "Confirm your email" link.  
> Instead, it uses `signInWithOtp()` which sends a **6-digit numeric code** to the user's email.

**Why?** Supabase's default confirmation email requires custom SMTP to be configured. The OTP method works out-of-the-box with Supabase's own email service.

**Flow:**
1. User fills out registration form
2. Account is created with `supabase.auth.signUp()`
3. A 6-digit OTP is sent via `supabase.auth.signInWithOtp()`
4. User enters the OTP on the verification page
5. Account is verified and user is redirected to their dashboard

### Email Template (Optional Customization)

If you want to customize the OTP email:

1. Go to Supabase Dashboard → **Authentication → Email Templates**
2. Select **"Magic Link"** template (this is what `signInWithOtp` uses)
3. Customize the HTML. Example:

```html
<h2>Your TMMS Verification Code</h2>
<p>Use the code below to verify your account:</p>
<h1 style="letter-spacing: 8px; font-size: 36px;">{{ .Token }}</h1>
<p>This code expires in 1 hour. Do not share it with anyone.</p>
```

### Database Tables

| Table | Description |
|-------|-------------|
| `profiles` | All users (linked to Supabase auth) |
| `drivers` | Driver-specific records |
| `operators` | Operator/cooperative records |
| `vehicles` | Registered PUV fleet |
| `violations` | Traffic violation records |
| `franchises` | Franchise applications & renewals |
| `routes` | Approved transport routes |
| `inspections` | Vehicle inspection records |

---

## Running the System

### Full System Startup (All 3 Services)

Open separate terminal windows for each:

```bash
# Terminal 1 — Staff/Admin (http://localhost:5173)
cd apps/web && npm run dev

# Terminal 2 — Driver/Operator Portal (http://localhost:5175)
cd apps/website && npm run dev

# Terminal 3 — AI Backend (http://localhost:8001)
cd apps/ai-service && venv\Scripts\activate && python main.py
```

### Service URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Staff/Admin Dashboard | http://localhost:5173 | Login as Admin, Staff, or Enforcer |
| Driver/Operator Portal | http://localhost:5175 | Register as Driver or Operator |
| AI Service API | http://localhost:8001 | CCTV violation detection backend |
| AI Service Docs | http://localhost:8001/docs | FastAPI auto-generated documentation |
| Supabase Dashboard | https://app.supabase.com | Database management |

---

## User Roles & Portals

### Staff/Admin Portal (`http://localhost:5173`)

| Role | Access |
|------|--------|
| **Admin** | Full system access — users, settings, reports |
| **Staff** | Fleet management, franchises, violations |
| **Enforcer** | Issue violations, view evidence |

**How to log in:** Use the pre-seeded accounts or create one in Supabase Dashboard under Authentication → Users.

---

### Driver/Operator Portal (`http://localhost:5175`)

| Role | Access |
|------|--------|
| **Driver** | View profile, license, violations, vehicle assignment |
| **Operator** | Manage fleet, drivers, franchise applications |

**How to register:**
1. Go to `http://localhost:5175/register`
2. Select your role (Driver or Operator)
3. Fill out the form
4. Check your email for the 6-digit OTP
5. Enter the OTP to verify and access your dashboard

---

## Common Issues & Fixes

### "Error sending confirmation email"
**Cause:** Supabase's default confirmation email requires custom SMTP.  
**Fix:** Already resolved — the system uses `signInWithOtp()` instead. If you still see this, make sure you're using the latest version of `RegisterPage.tsx`.

### "No API key found in request" (500 error)
**Cause:** The Supabase client was missing credentials.  
**Fix:** Already resolved — credentials are hardcoded in `src/lib/supabase.ts`. No `.env` needed for Supabase.

### "Failed to resolve import react-leaflet"
**Cause:** Missing npm package in `apps/website`.  
**Fix:**
```bash
cd apps/website
npm install react-leaflet leaflet @types/leaflet
```

### "Port 5174 is in use"
**Cause:** Another Vite instance is running.  
**Fix:** Vite will automatically try the next port (5175). This is expected.

### AI Service won't start
**Cause:** Missing Python dependencies or virtual environment not activated.  
**Fix:**
```bash
cd apps/ai-service
venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### Database changes not reflecting
**Cause:** Browser has cached old session data.  
**Fix:** Hard refresh (`Ctrl + Shift + R`) or clear localStorage in DevTools.

### Can't log in after registering
**Cause:** Email not verified yet.  
**Fix:** Check your email for the 6-digit OTP and enter it at `http://localhost:5175/verify-otp`.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Vanilla CSS (no TailwindCSS) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (OTP + password) |
| AI/ML | Python FastAPI, YOLOv8, OpenCV |
| Maps | React-Leaflet, OpenStreetMap |
| Charts | Recharts |
| Icons | Lucide React |
| Notifications | Sonner |

---

## Project Structure (Key Files)

```
apps/web/
├── src/
│   ├── lib/supabase.ts          ← Supabase client (credentials hardcoded here)
│   ├── contexts/AuthContext.tsx  ← Auth state management
│   ├── pages/auth/LoginPage.tsx  ← Staff/Admin login
│   └── App.tsx                  ← Routing (Staff/Admin only)

apps/website/
├── src/
│   ├── lib/supabase.ts          ← Supabase client (credentials hardcoded here)
│   ├── LandingPage.tsx          ← Public landing page
│   ├── pages/auth/
│   │   ├── RegisterPage.tsx     ← Driver/Operator registration
│   │   └── OTPVerificationPage.tsx ← 6-digit OTP verification
│   └── App.tsx                  ← Routing (Driver/Operator)

apps/ai-service/
├── main.py                      ← FastAPI entry point
├── vehicle_counter.py           ← YOLOv8 detection logic
├── requirements.txt             ← Python dependencies
└── .env                         ← AI service environment (not needed for DB)

packages/database/
├── seed.sql                     ← Full database schema + sample data
└── migrate_audit_logs.sql       ← Migration for audit log tables
```

---

## Need Help?

- **Supabase Dashboard:** https://app.supabase.com/project/repaixqtxgoynmlrpibi
- **Supabase Docs:** https://supabase.com/docs
- **React Docs:** https://react.dev
- **FastAPI Docs:** https://fastapi.tiangolo.com

---

*TMMS — GOVSERVE Platform © 2026. Built for Local Government Units.*
