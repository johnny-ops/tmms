# Render Deployment - Step by Step Guide

## The Problem You Had

❌ Error: `Could not open requirements file: [Errno 2] No such file or directory`

**Why?** Render was looking for `requirements.txt` in the root directory, but it's actually in `tmms/apps/ai-service/`.

## The Solution

✅ I added configuration files to tell Render where to find your code:
- `render.yaml` - Automatic deployment configuration
- `tmms/apps/ai-service/.python-version` - Specifies Python 3.12

---

## How to Deploy (Choose One Method)

### Method 1: Using Blueprint (Easiest - Recommended)

1. **Commit and push the new files**:
   ```bash
   git commit -m "Add Render configuration"
   git push origin main
   ```

2. **Go to Render Dashboard**:
   - Visit: https://dashboard.render.com/
   - Click "New +" button
   - Select **"Blueprint"**

3. **Connect Repository**:
   - Select "Connect a repository"
   - Choose `johnny-ops/tmms`
   - Render will automatically find `render.yaml`
   - Click **"Apply"**

4. **Add Environment Variables**:
   - After the service is created, click on it
   - Go to **"Environment"** tab
   - Add these variables:
     - `SUPABASE_URL` = `https://your-project.supabase.co`
     - `SUPABASE_KEY` = `your-service-role-key`
   - Click **"Save Changes"**

5. **Wait for Deployment**:
   - It will automatically rebuild with environment variables
   - Takes about 5-10 minutes
   - Check the **"Logs"** tab to see progress

6. **Get Your URL**:
   - Once deployed, you'll see your service URL
   - Example: `https://tmms-ai-service.onrender.com`
   - Test it: `https://tmms-ai-service.onrender.com/health`
   - Should return: `{"status":"healthy"}`

---

### Method 2: Manual Setup (If Blueprint Fails)

1. **Go to Render Dashboard**:
   - Visit: https://dashboard.render.com/
   - Click "New +" button
   - Select **"Web Service"**

2. **Connect Repository**:
   - Select "Connect a repository"
   - Choose `johnny-ops/tmms`

3. **⚠️ IMPORTANT: Configure Settings Correctly**:

   Fill in these fields **EXACTLY**:

   | Field | Value |
   |-------|-------|
   | **Name** | `tmms-ai-service` |
   | **Region** | Choose closest to you (e.g., Oregon USA) |
   | **Branch** | `main` |
   | **Root Directory** | `tmms/apps/ai-service` ← **MUST SET THIS!** |
   | **Runtime** | `Python 3` |
   | **Build Command** | `pip install -r requirements.txt` |
   | **Start Command** | `python main.py` |
   | **Instance Type** | `Free` |

4. **Add Environment Variables**:
   
   Click "Advanced" and add these:

   | Key | Value |
   |-----|-------|
   | `PYTHON_VERSION` | `3.12.0` |
   | `SUPABASE_URL` | Your Supabase URL |
   | `SUPABASE_KEY` | Your Supabase service role key |
   | `YOLO_DEVICE` | `cpu` |
   | `YOLO_MODEL_PATH` | `./yolov8n.pt` |
   | `YOLO_CONFIDENCE` | `0.35` |

5. **Create Web Service**:
   - Click **"Create Web Service"**
   - Wait for deployment (5-10 minutes)

6. **Verify Deployment**:
   - Once deployed, you'll see: "Your service is live 🎉"
   - Click on the URL or copy it
   - Test: `https://your-service.onrender.com/health`

---

## After Successful Deployment

### Step 1: Copy Your AI Service URL

Example: `https://tmms-ai-service.onrender.com`

### Step 2: Add to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your `tmms` project
3. Go to **Settings** → **Environment Variables**
4. Click **"Add New"**
5. Add:
   - **Key**: `VITE_AI_SERVICE_URL`
   - **Value**: `https://tmms-ai-service.onrender.com` (your actual URL)
   - **Environments**: Check ✅ Production
6. Click **"Save"**

### Step 3: Redeploy Vercel

1. Go to **Deployments** tab
2. Click **⋯** on the latest deployment
3. Click **"Redeploy"**
4. Wait for redeployment (~2 minutes)

### Step 4: Test Everything

1. Open your Vercel app: `https://tmms-three.vercel.app`
2. Login
3. Go to **AI Monitor** page
4. You should see AI service connected! ✅

---

## Troubleshooting

### Issue: Build Failed - "Could not open requirements file"

**Fix**: Make sure **Root Directory** is set to `tmms/apps/ai-service`

### Issue: Build Failed - Python version error

**Fix**: The `.python-version` file should handle this automatically. If not, add environment variable:
- `PYTHON_VERSION` = `3.12.0`

### Issue: Service starts but crashes immediately

**Check the Logs**:
1. Go to your service in Render
2. Click "Logs" tab
3. Look for errors

**Common causes**:
- Missing environment variables (SUPABASE_URL, SUPABASE_KEY)
- Invalid Supabase credentials

### Issue: "Your service is sleeping" (Free Tier)

**This is normal for free tier**:
- Services sleep after 15 minutes of inactivity
- First request after sleep takes ~30 seconds to wake up
- Upgrade to paid tier ($7/month) to prevent sleeping

### Issue: Can't download YOLOv8 model

**Solution**:
- Download `yolov8n.pt` manually: https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.pt
- Upload it via Render's file browser (not recommended)
- OR: Let it auto-download on first run (takes longer)
- OR: Upgrade to paid tier for persistent disk

---

## Important Notes

⚠️ **Free Tier Limitations**:
- Service sleeps after 15 minutes of inactivity
- 750 free hours per month
- Slower CPU (no GPU)
- No persistent disk (uploads are temporary)

💰 **Upgrade Benefits** ($7/month):
- Never sleeps
- Faster performance
- Persistent disk
- More memory

---

## Alternative: Run Locally

If Render is giving you trouble, you can run the AI service locally:

```bash
cd tmms/apps/ai-service
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
# Edit .env with your credentials
python main.py
```

Then use **ngrok** to expose it temporarily:
```bash
ngrok http 8001
```

Copy the ngrok URL (e.g., `https://abc123.ngrok.io`) and add it to Vercel as `VITE_AI_SERVICE_URL`.

⚠️ Note: ngrok free tier URLs expire when you restart.

---

## Need Help?

Post your Render logs or error messages and I can help debug! 🚀
