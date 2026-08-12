# How to Set Up Cron Job (Keep AI Service Awake)

## What is a Cron Job?

A cron job automatically visits your website at regular intervals to keep it awake. For Render's free tier, this prevents the 50-second wake-up delay.

---

## Step-by-Step: Using cron-job.org (Easiest!)

### Step 1: Sign Up for Free

1. **Go to**: https://cron-job.org/en/
2. Click **"SIGN UP FOR FREE"** (blue button, top right)
3. Fill in:
   - **Email**: Your email address
   - **Password**: Choose a password
   - **Username**: Choose a username
4. Click **"Sign up"**
5. **Check your email** and click the verification link

### Step 2: Log In

1. Go back to https://cron-job.org
2. Click **"LOG IN"** (top right)
3. Enter your email and password
4. Click **"Log in"**

### Step 3: Create Your First Cron Job

1. After logging in, you'll see the **Dashboard**
2. Click **"Cronjobs"** in the left menu
3. Click the blue **"CREATE CRONJOB"** button

### Step 4: Configure the Cron Job

Fill in these settings:

#### Basic Settings:

| Field | What to Enter |
|-------|---------------|
| **Title** | `Keep Render AI Service Awake` |
| **Address (URL)** | `https://tmms-ai-service.onrender.com/health` |

#### Schedule Settings:

Scroll down to **"Schedule"** section:

1. Click on **"Every 10 minutes"** (or choose from dropdown)
   - Or click **"Advanced"** and enter: `*/10 * * * *`

#### Optional Settings:

You can leave these as default, but here's what they mean:

| Setting | Recommended Value | What it does |
|---------|-------------------|--------------|
| **Enabled** | ✅ Checked | Starts the cron job immediately |
| **Save responses** | ❌ Unchecked | We don't need to save responses |
| **Notify on failure** | ✅ Checked | Sends email if service is down |
| **Timeout** | 30 seconds | How long to wait for response |

### Step 5: Save the Cron Job

1. Scroll to the bottom
2. Click the blue **"CREATE"** button
3. You'll see your cron job in the list!

### Step 6: Verify It's Working

1. Look at your cron job in the dashboard
2. You'll see columns like:
   - **Title**: Keep Render AI Service Awake
   - **Status**: 🟢 Enabled
   - **Last execution**: (will show time after first run)
   - **Success rate**: Should be 100%

3. Wait 10 minutes and refresh the page
4. The **"Last execution"** should update with a recent timestamp
5. If you see a ✅ green checkmark, it's working!

---

## What You'll See

### In cron-job.org Dashboard:

```
Title: Keep Render AI Service Awake
URL: https://tmms-ai-service.onrender.com/health
Schedule: Every 10 minutes
Status: 🟢 Enabled
Last execution: 2026-08-12 18:45:00
Success rate: 100%
```

### In Render Dashboard:

1. Go to https://dashboard.render.com/
2. Click on your **tmms-ai-service**
3. Look at **Metrics** tab
4. You'll see regular requests every 10 minutes ✅

---

## Troubleshooting

### Problem: "Execution failed"

**Check:**
1. Is your Render service running?
2. Visit `https://tmms-ai-service.onrender.com/health` in browser
3. Should return: `{"status":"ok",...}`

**Fix:**
- If service is down, check Render logs
- Make sure service deployed successfully

### Problem: "Too many failures"

**Possible causes:**
1. Service is sleeping (normal on first request)
2. Service crashed (check Render logs)
3. Render is redeploying (temporary)

**Fix:**
- Check Render dashboard for errors
- Review deployment logs
- Ensure environment variables are set

### Problem: Can't log in to cron-job.org

**Fix:**
1. Click "Forgot password?"
2. Reset your password
3. Check spam folder for email

---

## Advanced: Custom Schedule

If you want to ping more or less frequently:

### Every 5 minutes (more aggressive):
```
Schedule: */5 * * * *
```

### Every 14 minutes (just before 15-min timeout):
```
Schedule: */14 * * * *
```

### Only during business hours (9 AM - 5 PM):
```
Schedule: */10 9-17 * * *
```

---

## Benefits of Using Cron Job

✅ **No more 50-second delays** - Service stays warm
✅ **Free forever** - cron-job.org free tier is generous
✅ **Email alerts** - Get notified if service goes down
✅ **Easy to manage** - Simple dashboard interface
✅ **Reliable** - Service has 99.9% uptime

---

## Cost Comparison

| Solution | Cost | Wake-up Time | Complexity |
|----------|------|--------------|------------|
| **Cron Job (Free)** | $0/mo | Instant ⚡ | Easy |
| **Render Free Tier** | $0/mo | 50 seconds 😴 | None needed |
| **Render Paid** | $7/mo | Instant ⚡ | None needed |

**Recommendation**: Use the free cron job! It's the best of both worlds.

---

## Screenshots Reference

### Step 1: Homepage
Look for the blue **"SIGN UP FOR FREE"** button at top right

### Step 2: Create Cronjob
You'll see a form with:
- Title field
- URL field
- Schedule dropdown

### Step 3: Dashboard
After creating, you'll see a table with your cron jobs listed

---

## Alternative: UptimeRobot

If cron-job.org doesn't work for you, try UptimeRobot:

1. Go to https://uptimerobot.com
2. Sign up for free
3. Add New Monitor:
   - **Type**: HTTP(s)
   - **Name**: Render AI Service
   - **URL**: `https://tmms-ai-service.onrender.com/health`
   - **Interval**: 5 minutes
4. Save

UptimeRobot will ping every 5 minutes and send alerts if down.

---

## You're Done! 🎉

Your Render service will now:
- ✅ Stay awake 24/7
- ✅ Respond instantly to user requests
- ✅ Provide better user experience
- ✅ Cost you $0

Test it: Open your Vercel app and go to AI Monitor page - should connect immediately!

---

## Need Help?

- **cron-job.org support**: https://cron-job.org/en/documentation/
- **Check if your URL is correct**: Open `https://tmms-ai-service.onrender.com/health` in browser
- **Verify Render is running**: Check https://dashboard.render.com/

Your AI service should now stay awake and work perfectly! 🚀
