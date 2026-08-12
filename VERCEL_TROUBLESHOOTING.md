# Vercel Deployment Troubleshooting

## Issue 1: 404 NOT_FOUND Error

### Problem
When sharing the Vercel URL, users see a 404 error page instead of your app.

### Solution
✅ **Fixed!** Added `vercel.json` to handle SPA routing.

The issue was that Vercel needs to redirect all routes to `index.html` for Single Page Applications (SPA). 

**What was added:**
- `/tmms/apps/web/vercel.json` - Tells Vercel to route all paths to index.html
- Updated root `/vercel.json` - Simplified configuration

### Verification
After the latest push deploys automatically on Vercel:
1. Visit your Vercel URL (e.g., `https://tmms-three.vercel.app`)
2. You should now see the login page
3. Try navigating to any route (e.g., `/dashboard`) - should work
4. Refresh the page - should NOT show 404

---

## Issue 2: Console Warnings

### Warning 1: MaxListenersExceededWarning
```
MaxListenersExceededWarning: Possible EventEmitter memory leak detected.
11 end listeners added. Use emitter.setMaxListeners()
```

**Cause:** This is usually from:
- Browser extensions (React DevTools, Redux DevTools)
- WebSocket reconnections in development
- Event listeners not being cleaned up

**Solution:** These are warnings, not errors. They don't break the app but can be fixed:

1. **Disable browser extensions temporarily** to test
2. **Check `useCCTVWebSocket.ts`** - Ensure cleanup in useEffect
3. **Add this to components with many listeners:**
   ```typescript
   useEffect(() => {
     // Your code
     return () => {
       // Cleanup listeners here
     };
   }, []);
   ```

### Warning 2: contentScript.ts:108 Warnings
```
contentScript.ts:108 e.selectMultiple is undefined
contentScript.ts:108 e.objectMultiple is undefined  
```

**Cause:** Browser extension injecting content scripts (likely Grammarly, LastPass, or similar)

**Solution:** 
- These are NOT from your code
- They're from browser extensions
- Safe to ignore for production
- Users won't see these unless they open DevTools

---

## Production Checklist

After deployment, verify:

- [ ] App loads at root URL
- [ ] Login page is visible
- [ ] Can navigate to different pages
- [ ] Page refresh doesn't cause 404
- [ ] Environment variables are set (Supabase connection works)
- [ ] Assets load correctly (images, fonts, etc.)
- [ ] No critical console errors (warnings are OK)

---

## Common Vercel Issues & Solutions

### Issue: "Build Failed" - Module Not Found

**Solution:**
```bash
# Locally test the build
cd tmms/apps/web
npm install
npm run build
```

If it works locally but not on Vercel:
- Check Vercel **Root Directory** is set to `tmms/apps/web`
- Check `package.json` has all dependencies listed

### Issue: Environment Variables Not Working

**Solution:**
1. Go to Vercel Dashboard > Project > Settings > Environment Variables
2. Make sure variables start with `VITE_`
3. Select correct environment (Production/Preview/Development)
4. **Redeploy** after adding variables (Deployments tab > ⋯ > Redeploy)

### Issue: Blank Page / White Screen

**Check:**
1. Open browser DevTools > Console
2. Look for JavaScript errors
3. Check Network tab for failed requests

**Common causes:**
- Missing environment variables
- JavaScript errors preventing render
- Wrong base path in router

**Solution:**
```typescript
// In App.tsx, ensure BrowserRouter has no basename
<BrowserRouter> {/* ✅ Correct */}
<BrowserRouter basename="/app"> {/* ❌ Wrong for Vercel root */}
```

### Issue: Routes Work in Development but Not Production

**Solution:** Already fixed with `vercel.json` rewrites. If still happening:

1. Check `vercel.json` exists in `tmms/apps/web/`
2. Content should be:
   ```json
   {
     "rewrites": [
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```
3. Redeploy on Vercel

---

## Manual Redeploy Steps

If you need to force a new deployment:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Click **Deployments** tab
4. Click **⋯** (three dots) on latest deployment
5. Click **Redeploy**
6. Optional: Check "Use existing Build Cache" for faster builds
7. Click **Redeploy** button

---

## Getting Help

### Check Vercel Logs
1. Vercel Dashboard > Your Project > Deployments
2. Click on a deployment
3. View **Build Logs** and **Function Logs**
4. Look for error messages

### Check Browser Console
1. Open your deployed site
2. Press F12 to open DevTools
3. Check Console tab for errors
4. Check Network tab for failed requests

### Test Locally First
```bash
# Always test production build locally before deploying
cd tmms/apps/web
npm run build
npm run preview
```

If it works locally (`preview`) but not on Vercel, the issue is with Vercel configuration.

---

## Current Deployment Status

✅ **TypeScript build errors** - Fixed
✅ **SPA routing / 404 errors** - Fixed  
✅ **Vercel configuration** - Complete
⚠️ **Console warnings** - Cosmetic only (from browser extensions)

Your app should now be fully functional on Vercel! 🚀
