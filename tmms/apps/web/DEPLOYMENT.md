# Web App Deployment

## Quick Vercel Setup

### Option 1: Using Vercel Dashboard (Recommended)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import `johnny-ops/tmms`
3. Set **Root Directory** to: `tmms/apps/web`
4. Add environment variables (see below)
5. Click Deploy

### Option 2: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to web app
cd tmms/apps/web

# Login to Vercel
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod
```

## Required Environment Variables

Add these in Vercel Dashboard → Project Settings → Environment Variables:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Build Settings

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`
- **Node Version**: 20

## Local Testing

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Troubleshooting

### Build fails with TypeScript errors
```bash
# Check TypeScript locally
npm run build
```

### Environment variables not working
- Make sure they start with `VITE_`
- Redeploy after adding variables
- Check Vercel deployment logs

### Assets not loading
- Ensure assets are in `public/` or `src/assets/`
- Use relative paths or import statements

## Post-Deployment

✅ Test all routes
✅ Check authentication
✅ Verify API connections
✅ Check browser console for errors
