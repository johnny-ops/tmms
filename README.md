# GOVSERVE — Transport Management & Monitoring System (TMMS)

> A full-stack, AI-powered government transport management platform for the Lipa City LGU.

---

## 📋 Table of Contents
- [System Overview](#system-overview)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Installation Guide](#installation-guide)
- [Running the System](#running-the-system)
- [Environment Variables](#environment-variables)
- [Supabase Database Setup](#supabase-database-setup)
- [AI Monitoring System](#ai-monitoring-system)
- [Features](#features)
- [Default Login](#default-login)
- [GitHub Push Guide](#github-push-guide)

---

## 🏛️ System Overview

GOVSERVE TMMS is a transport management system that provides:
- PUV & Driver Registry Management
- Franchise & Permit Issuance
- Traffic Violation Ticketing
- AI-Powered YOLO Vehicle Detection via CCTV
- Parking Area Management
- Compliance & Inspection Tracking
- Transportation Analytics & Dashboards

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + TypeScript |
| Backend API | FastAPI (Python 3.12) |
| AI Engine | YOLOv8 (Ultralytics) + ByteTrack |
| Database | Supabase (PostgreSQL) |
| Realtime | WebSocket (FastAPI) |
| Styling | Vanilla CSS |
| Routing | React Router v7 |
| Charts | Recharts |
| Maps | Leaflet.js |

---

## 📦 Prerequisites

### System Requirements
- **Windows** 10/11 (64-bit)
- **RAM**: Minimum 8 GB (16 GB recommended for YOLO inference)
- **Disk**: At least 5 GB free space
- **GPU**: Optional but recommended for faster YOLO inference

### Required Software

| Software | Version | Download |
|----------|---------|----------|
| **Python** | **3.12** | https://python.org/downloads |
| **Node.js** | 18+ (LTS) | https://nodejs.org |
| **npm** | 9+ (comes with Node.js) | — |
| **Git** | Latest | https://git-scm.com |

> ⚠️ **IMPORTANT**: Python 3.12 is required. The YOLO AI service is tested specifically with Python 3.12. Do NOT use Python 3.13+ as some ML dependencies may be incompatible.

---

## 🗂️ Project Structure

```
GOVSERVE/
└── tmms/
    ├── apps/
    │   ├── web/                  # React Frontend App
    │   │   ├── public/           # Static files (logo.jpg goes here)
    │   │   ├── src/
    │   │   │   ├── pages/        # All page components
    │   │   │   ├── components/   # Reusable UI components
    │   │   │   ├── hooks/        # Custom React hooks
    │   │   │   ├── lib/          # Supabase client, utilities
    │   │   │   └── types/        # TypeScript types
    │   │   └── package.json
    │   │
    │   └── ai-service/           # Python FastAPI YOLO Backend
    │       ├── main.py           # Main API server
    │       ├── streaming/        # Stream manager (MP4/RTSP/HLS)
    │       ├── vehicle_counter.py
    │       ├── requirements.txt  # Python dependencies
    │       ├── yolov8n.pt        # YOLO model weights
    │       ├── test-videos/      # Sample videos for testing
    │       └── .env              # AI service environment variables
    │
    └── packages/
        └── database/             # Supabase SQL schemas and seeds
```

---

## 🚀 Installation Guide

### Step 1 — Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/GOVSERVE.git
cd GOVSERVE
```

### Step 2 — Setup the Frontend (Web App)

```bash
cd tmms/apps/web
npm install
```

Create the environment file:
```bash
# Create tmms/apps/web/.env
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### Step 3 — Setup the AI Service (Python)

> Make sure you have **Python 3.12** installed. Verify with: `python --version`

```bash
cd tmms/apps/ai-service
```

**Create a virtual environment:**
```bash
python -m venv venv
```

**Activate the virtual environment:**
```bash
# Windows (PowerShell)
.\venv\Scripts\Activate.ps1

# Windows (Command Prompt)
.\venv\Scripts\activate.bat
```

**Install Python dependencies:**
```bash
pip install -r requirements.txt
```

> ⚠️ This will download ~2 GB of packages including PyTorch and OpenCV. It may take 5–15 minutes depending on your internet speed.

**Create the AI service environment file:**
```bash
# Create tmms/apps/ai-service/.env
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_service_role_key_here
YOLO_MODEL_PATH=./yolov8n.pt
YOLO_CONFIDENCE=0.35
YOLO_IMG_SIZE=640
YOLO_INFERENCE_FPS=10
YOLO_DEVICE=auto
PORT=8001
```

> **Note on YOLO_DEVICE**: Set to `auto` (default), `cpu`, or `cuda` if you have an NVIDIA GPU.

---

## ▶️ Running the System

You need **two terminals** running simultaneously.

### Terminal 1 — Start the AI Backend

```bash
cd tmms/apps/ai-service
.\venv\Scripts\Activate.ps1
.\venv\Scripts\python.exe main.py
```

You should see:
```
INFO: Application startup complete.
INFO: Uvicorn running on http://0.0.0.0:8001
```

The AI service will automatically start the YOLO inference loop on `CAM-001` using the sample traffic video.

### Terminal 2 — Start the Web Frontend

```bash
cd tmms/apps/web
npm run dev
```

You should see:
```
VITE v8.x.x ready in Xms
➜  Local:   http://localhost:5173/
```

### Open in Browser
Visit: **http://localhost:5173**

---

## 🔐 Environment Variables

### Frontend (`tmms/apps/web/.env`)

| Variable | Description |
|----------|------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key |

### AI Service (`tmms/apps/ai-service/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `SUPABASE_URL` | — | Supabase project URL |
| `SUPABASE_KEY` | — | Supabase **service role** key (NOT the anon key) |
| `YOLO_MODEL_PATH` | `./yolov8n.pt` | Path to YOLOv8 model weights |
| `YOLO_CONFIDENCE` | `0.35` | Detection confidence threshold (0.0–1.0) |
| `YOLO_IMG_SIZE` | `640` | Input image resolution for YOLO |
| `YOLO_INFERENCE_FPS` | `10` | Target inference frames per second |
| `YOLO_DEVICE` | `auto` | `auto`, `cpu`, or `cuda` |
| `PORT` | `8001` | AI service HTTP/WS port |

---

## 🗄️ Supabase Database Setup

1. Go to [https://supabase.com](https://supabase.com) and create a new project.
2. In your Supabase dashboard, go to **SQL Editor**.
3. Run the SQL files in this order:
   ```
   tmms/packages/database/schema.sql
   tmms/packages/database/seed.sql
   ```
4. If prompted, also run:
   ```
   tmms/packages/database/migrate_production.sql
   ```
5. Copy your **Project URL** and **API keys** to the `.env` files.

---

## 🤖 AI Monitoring System

### How It Works

The AI monitoring pipeline:
1. **Video Source**: Loops `sample.mp4` (local traffic video for testing)
2. **YOLOv8 Inference**: Detects vehicles (car, motorcycle, bus, truck)
3. **ByteTrack Tracking**: Assigns persistent tracking IDs across frames
4. **Violation Detection**: Virtual tripwire line crossing detection
5. **Supabase Logging**: Saves violation candidates to the database
6. **MJPEG Stream**: Sends annotated video frames to the browser
7. **WebSocket Stats**: Sends live detection statistics to the UI

### Testing YOLO

1. Start both services (see above).
2. Navigate to **AI Monitor** in the sidebar.
3. The YOLO stream auto-starts — you should see the annotated video with green bounding boxes.
4. Click **"Configure Rules"** to drag the violation detection line.
5. Click **"Save Layout"** to persist the line configuration.

### Supported Video Sources
- **Local MP4** (default — `sample.mp4`)
- **Webcam** (browser getUserMedia)
- **HLS stream** (e.g. `http://example.com/stream.m3u8`)
- **RTSP stream** (requires local network camera)

---

## 🌟 Features

| Module | Status |
|--------|--------|
| Dashboard | ✅ Live |
| PUV Database | ✅ Live — Full CRUD |
| Operators | ✅ Live — Full CRUD |
| Drivers | ✅ Live — Full CRUD |
| Routes | ✅ Live |
| Franchise Management | ✅ Live — Full CRUD + Review Workflow |
| Traffic Violations | ✅ Live — Ticketing + Payment Settlement |
| AI Monitor (YOLO) | ✅ Live — Real-time Detection |
| Evidence Upload | ✅ Live |
| Vehicle Inspections | ✅ Live |
| Registrations | ✅ Live |
| Parking Areas | ✅ Live |
| Parking Slots | ✅ Live — Real-time Occupancy |
| Terminals | ✅ Live |
| Transportation Analytics | ✅ Live |
| Demand Forecast | ✅ Live |
| Route Optimization | 🔧 Under Maintenance |
| Settings | 🔧 Under Maintenance |

---

## 🔑 Default Login

| Field | Value |
|-------|-------|
| Email | `admin@lgu-tmms.gov.ph` |
| Password | `admin123` |

> ⚠️ Change this password immediately in a production environment!

---

## 📤 GitHub Push Guide

### Initialize and Push for the First Time

```bash
cd C:\xampp\htdocs\GOVSERVE

git init
git add .
git commit -m "Initial commit — GOVSERVE TMMS v1.0"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/GOVSERVE.git
git push -u origin main
```

### Add a `.gitignore` File First!

Create `C:\xampp\htdocs\GOVSERVE\.gitignore`:
```gitignore
# Python virtual environment
tmms/apps/ai-service/venv/
tmms/apps/ai-service/__pycache__/
tmms/apps/ai-service/*.pyc

# Node modules
node_modules/
tmms/apps/web/node_modules/
tmms/apps/api/node_modules/

# Build outputs
dist/
build/

# Environment variables (SENSITIVE!)
.env
*.env

# YOLO model weights (large files)
*.pt

# Video test files
tmms/apps/ai-service/test-videos/

# Logs
*.log
```

### Subsequent Pushes

```bash
cd C:\xampp\htdocs\GOVSERVE
git add .
git commit -m "Your commit message here"
git push
```

---

## 🆘 Troubleshooting

### "python is not recognized"
- Make sure Python 3.12 is installed and added to PATH.
- Use `py -3.12` or `.\venv\Scripts\python.exe` instead.

### YOLO model download fails
- The `yolov8n.pt` should already be in `tmms/apps/ai-service/`.
- If missing, it will auto-download on first run (requires internet).

### WebSocket connection fails
- Ensure the AI service is running on port 8001.
- Check Windows Firewall is not blocking port 8001.

### Supabase errors
- Double-check your `.env` files have the correct keys.
- Ensure you ran all SQL migration files in order.

---

*Built for Lipa City LGU — Transport Management & Monitoring System*
