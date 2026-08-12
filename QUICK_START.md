# Quick Start Guide

## Run AI Service Locally (Easiest Way to Test)

### Step 1: Open Terminal in AI Service Folder

```bash
cd c:\xampp\htdocs\GOVSERVE\tmms\apps\ai-service
```

### Step 2: Create Virtual Environment (First Time Only)

```powershell
python -m venv venv
```

### Step 3: Activate Virtual Environment

```powershell
.\venv\Scripts\Activate.ps1
```

If you get an error about execution policy, run this first:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Step 4: Install Dependencies (First Time Only)

```powershell
pip install -r requirements.txt
```

This will take a few minutes.

### Step 5: Setup Environment Variables

```powershell
# Copy the example file
copy .env.example .env

# Edit .env with Notepad
notepad .env
```

Update these values in `.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
PORT=8001
YOLO_DEVICE=cpu
```

Get Supabase credentials from: https://supabase.com/dashboard → Your Project → Settings → API

### Step 6: Run the Service

```powershell
python main.py
```

You should see:
```
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:8001
```

✅ **AI Service is now running!**

### Step 7: Test It

Open browser and go to:
- http://localhost:8001/health

You should see: `{"status":"healthy"}`

---

## Now Your Vercel App Will Work with AI Features!

1. Keep the AI service running (don't close the terminal)
2. Open your Vercel app: https://tmms-three.vercel.app
3. Login and go to **AI Monitor** page
4. The AI features should now work!

---

## For Production: Deploy AI Service

See **AI_SERVICE_DEPLOYMENT.md** for full deployment guide.

**Recommended: Render.com**
1. Sign up at https://render.com
2. Create New Web Service
3. Connect GitHub repo: `johnny-ops/tmms`
4. Root Directory: `tmms/apps/ai-service`
5. Build Command: `pip install -r requirements.txt`
6. Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
7. Add environment variables (same as above)
8. Deploy!

After deployment, add to Vercel:
- Go to Vercel → Settings → Environment Variables
- Add: `VITE_AI_SERVICE_URL` = `https://your-service.onrender.com`
- Redeploy

---

## Troubleshooting

### "Python not found"
Install Python 3.12: https://www.python.org/downloads/

### "Port 8001 already in use"
Change port in `.env`: `PORT=8002`

### "Module not found"
Make sure virtual environment is activated:
```powershell
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### AI Service starts but frontend shows "offline"
- Check if http://localhost:8001/health returns `{"status":"healthy"}`
- Make sure port 8001 is not blocked by firewall
- Try restarting the AI service

---

## Stop AI Service

Press **Ctrl+C** in the terminal where it's running

---

## Deactivate Virtual Environment

```powershell
deactivate
```
