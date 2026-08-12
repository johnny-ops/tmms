# AI Service Deployment Guide

The AI service is a Python FastAPI backend that cannot run on Vercel (Vercel only supports Node.js serverless functions). You need to deploy it separately.

## Quick Start: Run Locally

### Step 1: Setup Python Environment

```bash
# Navigate to AI service folder
cd tmms/apps/ai-service

# Create virtual environment (Python 3.12 required)
python -m venv venv

# Activate virtual environment
# Windows PowerShell:
.\venv\Scripts\Activate.ps1

# Windows CMD:
.\venv\Scripts\activate.bat

# Install dependencies
pip install -r requirements.txt
```

### Step 2: Configure Environment

```bash
# Copy example config
copy .env.example .env

# Edit .env file with your settings:
# - SUPABASE_URL (your Supabase project URL)
# - SUPABASE_KEY (service role key from Supabase)
# - PORT=8001 (default)
```

### Step 3: Run the Service

```bash
# Make sure venv is activated, then:
python main.py
```

Service will run at: **http://localhost:8001**

### Step 4: Test the Service

Open browser and visit:
- http://localhost:8001/health - Should return `{"status": "healthy"}`
- http://localhost:8001/docs - FastAPI interactive documentation

---

## Option 1: Deploy to Render (Recommended - Free Tier Available)

Render is great for Python services and has a free tier.

### Steps:

1. **Sign up at [render.com](https://render.com)**

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository: `johnny-ops/tmms`

3. **Configure Service**
   - **Name**: `tmms-ai-service`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: `tmms/apps/ai-service`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: Free (or paid for better performance)

4. **Add Environment Variables**
   - `SUPABASE_URL` → Your Supabase URL
   - `SUPABASE_KEY` → Your Supabase service role key
   - `YOLO_MODEL_PATH` → `./yolov8n.pt`
   - `YOLO_CONFIDENCE` → `0.35`
   - `YOLO_DEVICE` → `cpu` (GPU not available on free tier)
   - `PORT` → Will be auto-set by Render

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes first time)
   - Your service will be at: `https://tmms-ai-service.onrender.com`

### Important Notes for Render:

⚠️ **Free tier sleeps after 15 min of inactivity** - First request after sleep takes ~30 seconds to wake up

⚠️ **YOLOv8 model file (`yolov8n.pt`) is NOT in Git** - You need to:
- Download it manually from: https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.pt
- Upload it via Render's File Browser, OR
- Let the service auto-download it on first run (will take longer)

---

## Option 2: Deploy to Railway.app

Railway is another good option with generous free tier.

### Steps:

1. **Sign up at [railway.app](https://railway.app)**

2. **New Project → Deploy from GitHub**
   - Select `johnny-ops/tmms`

3. **Configure**
   - **Root Directory**: `tmms/apps/ai-service`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

4. **Add Environment Variables** (same as Render)

5. **Deploy**
   - Your service: `https://tmms-ai-service.up.railway.app`

---

## Option 3: Deploy to Fly.io

Fly.io offers free tier with better performance.

### Steps:

1. **Install flyctl**: https://fly.io/docs/hands-on/install-flyctl/

2. **Login**:
   ```bash
   flyctl auth login
   ```

3. **Navigate to AI service**:
   ```bash
   cd tmms/apps/ai-service
   ```

4. **Launch**:
   ```bash
   flyctl launch
   ```
   - Follow prompts
   - It will create `fly.toml` config file

5. **Set Environment Variables**:
   ```bash
   flyctl secrets set SUPABASE_URL=your_url
   flyctl secrets set SUPABASE_KEY=your_key
   flyctl secrets set YOLO_DEVICE=cpu
   ```

6. **Deploy**:
   ```bash
   flyctl deploy
   ```

---

## Option 4: Keep Running Locally + Use Ngrok (Development Only)

If you want to test with your deployed Vercel app but keep AI service on your local machine:

### Steps:

1. **Install ngrok**: https://ngrok.com/download

2. **Run AI service locally**:
   ```bash
   cd tmms/apps/ai-service
   python main.py
   ```

3. **In another terminal, expose port 8001**:
   ```bash
   ngrok http 8001
   ```

4. **Copy the ngrok URL** (e.g., `https://abc123.ngrok.io`)

5. **Update Vercel environment variable**:
   - Add `VITE_AI_SERVICE_URL=https://abc123.ngrok.io`
   - (After we update the frontend code to use this variable)

⚠️ **Note**: Ngrok free tier URLs change every time you restart. Not suitable for production.

---

## After Deploying AI Service

### Update Frontend to Use Deployed URL

Once you have the AI service URL (e.g., `https://tmms-ai-service.onrender.com`), you need to:

1. **Add environment variable to Vercel**:
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add: `VITE_AI_SERVICE_URL=https://tmms-ai-service.onrender.com`
   - Redeploy

2. **I'll update the frontend code** to use this variable instead of `http://localhost:8001`

---

## Comparison

| Platform | Free Tier | Pros | Cons |
|----------|-----------|------|------|
| **Render** | ✅ Yes | Easy setup, auto-deploy | Sleeps after 15min inactivity |
| **Railway** | ✅ Yes ($5 credit) | Fast, good DX | Limited free hours |
| **Fly.io** | ✅ Yes | Better performance | Slightly complex setup |
| **Ngrok** | ✅ Yes | Instant testing | URL changes, dev only |
| **Local** | ✅ Free | Full control | Your PC must stay on |

---

## Recommended Setup

**For Development/Testing**:
- Run AI service locally (`python main.py`)
- Use ngrok for temporary testing with deployed Vercel app

**For Production**:
- Deploy AI service to **Render** (easiest)
- Update Vercel environment variable with deployed URL

---

## Need Help?

### AI Service won't start:
```bash
# Check Python version
python --version  # Should be 3.12+

# Check if port 8001 is in use
netstat -ano | findstr :8001

# Try different port
# In .env: PORT=8002
```

### YOLOv8 model not found:
```bash
# Download manually
curl -L https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.pt -o yolov8n.pt
```

### Out of memory on free tier:
- Use smaller YOLO model (yolov8n is smallest)
- Reduce `YOLO_IMG_SIZE` to 416 or 320
- Upgrade to paid tier

---

## What's Next?

1. Choose a deployment option above
2. Deploy the AI service
3. Get the deployed URL
4. Let me know, and I'll update the frontend code to use it
5. Add `VITE_AI_SERVICE_URL` to Vercel environment variables
6. Redeploy on Vercel

Your AI features will then work on the deployed app! 🚀
