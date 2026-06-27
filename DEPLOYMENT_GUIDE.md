# ProctorAI Vercel Deployment Guide

## Overview
This guide walks you through deploying ProctorAI to Vercel with Neon PostgreSQL database.

## Prerequisites
- Vercel account (https://vercel.com)
- Neon database account (https://neon.tech)
- GitHub repository with your project
- OpenRouter API key (from https://openrouter.ai)

---

## Step 1: Set Up Neon Database

### 1.1 Create a Neon Project
1. Go to https://neon.tech and sign up/login
2. Create a new project (e.g., "proctorAI-prod")
3. Copy the connection string - it will look like:
   ```
   postgresql://user:password@host.neon.tech/database?sslmode=require
   ```

### 1.2 Verify Connection Locally
```bash
# Before deploying, test the connection from your local machine
DATABASE_URL="your-neon-connection-string" pnpm run db:push
```

---

## Step 2: Configure Clerk Authentication

### 2.1 Create Production Clerk Instance
1. Go to Clerk Dashboard (https://dashboard.clerk.com)
2. Create a new application for production or use existing
3. Get your **production** keys:
   - `CLERK_PUBLISHABLE_KEY` (starts with `pk_live_`)
   - `CLERK_SECRET_KEY` (starts with `sk_live_`)

### 2.2 Configure Clerk URLs
In Clerk Dashboard → Settings → URLs, set:
- **Development URL**: `http://localhost:5173`
- **Production URL**: `https://your-proctor-ai-domain.com`
- **API URL**: `https://your-api-domain.vercel.app/auth` (we'll set this after first deploy)

---

## Step 3: Deploy to Vercel

### 3.1 Connect GitHub Repository
1. Go to https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Select your GitHub repository containing ProctorAI
4. Vercel will auto-detect settings

### 3.2 Configure Environment Variables
In Vercel Project Settings → Environment Variables, add:

```
DATABASE_URL=postgresql://user:password@host.neon.tech/database?sslmode=require
CLERK_PUBLISHABLE_KEY=pk_live_xxx
CLERK_SECRET_KEY=sk_live_xxx
CLERK_PROXY_URL=https://your-api-domain.vercel.app/auth
OPENROUTER_API_KEY=sk_or_xxx
PORT=3000
NODE_ENV=production
```

### 3.3 Build Settings
- **Build Command**: `pnpm run build:prod`
- **Output Directory**: `artifacts/proctor-ai/dist/public`
- **Install Command**: `pnpm install`

### 3.4 Deploy
1. Click "Deploy"
2. Watch the logs - you should see:
   ✅ Dependencies installed
   ✅ TypeScript compiled
   ✅ Frontend built
   ✅ API server built
   ✅ Server started successfully

---

## Step 4: Run Database Migrations

### 4.1 First Deployment (New Database)
After Vercel deployment completes, run migrations:

**Option A: Using Vercel Functions (Recommended for future migrations)**
```bash
# SSH into Vercel or use a one-off migration
# This will be executed during build
```

**Option B: Manual Migration (For Initial Setup)**
```bash
# From your local machine, with production DATABASE_URL
DATABASE_URL="postgresql://..." pnpm run db:push
```

**Option C: Using Neon Console**
You can also apply migrations directly in Neon's SQL editor if needed.

### 4.2 Verify Database
Check that tables were created:
```bash
psql "your-neon-connection-string" -c "\dt"
```

You should see tables: `exams`, `questions`, `exam_sessions`, `users`, `cheating_flags`, `flags`, etc.

---

## Step 5: Post-Deployment Configuration

### 5.1 Update Clerk Configuration
After your API deploys at `https://your-api-domain.vercel.app`:
1. Go to Clerk Dashboard
2. Settings → URLs
3. Update **Proxy URL** to: `https://your-api-domain.vercel.app/auth`

### 5.2 Update Frontend Environment
The frontend needs to know about the API and Clerk keys. Vercel automatically uses:
```
VITE_API_URL=/api                    # Will proxy to your API
VITE_CLERK_PUBLISHABLE_KEY=pk_live_xxx
```

---

## Deployment Architecture

```
┌─────────────────┐
│  vercel.json    │ ← Root configuration
└────────┬────────┘
         │
    ┌────┴──────────────────────────────┐
    │                                   │
    ▼                                   ▼
┌──────────────────────┐        ┌─────────────────┐
│  proctor-ai (SPA)    │        │  api-server     │
│  - React + Vite      │        │  - Express.js   │
│  - Build: Vite       │        │  - Build: esbuild│
│  - Output: dist/     │        │  - Output: dist/ │
└──────────────────────┘        └────────┬────────┘
         │                              │
         │                              ▼
         │                      ┌──────────────────┐
         │                      │  Database Init   │
         │                      │  - Drizzle Push  │
         │                      │  - Auto-migrate  │
         │                      └────────┬─────────┘
         │                              │
         ▼                              ▼
    ┌────────────────────────────────────────────┐
    │           Neon PostgreSQL                  │
    │  (All tables created, data persisted)      │
    └─────────────────────────────────────────────┘
```

---

## Troubleshooting

### Issue: "DATABASE_URL is required"
**Solution**: Add `DATABASE_URL` to Vercel Environment Variables (don't forget Neon SSL mode: `?sslmode=require`)

### Issue: "Clerk keys not configured"
**Solution**: Ensure you're using **production** keys (pk_live_ / sk_live_), not test keys

### Issue: Database migration fails
```bash
# Check Neon connection
psql "your-neon-connection-string" -c "SELECT 1"

# Try force push
DATABASE_URL="..." pnpm run db:push-force
```

### Issue: Frontend shows "404 /api/users/me"
**Solution**: The API proxy might be misconfigured. Check:
1. Vercel function logs: `https://vercel.com/[team]/[project]/functions`
2. Ensure API environment variables are set
3. Try: `curl https://your-api-domain.vercel.app/api/healthz`

### Issue: Cold start taking too long
**Solution**: Vercel Functions have a max timeout of 60s. This is set in root `vercel.json`. For longer operations, consider:
1. Database optimization
2. Lazy loading of heavy dependencies
3. Using Vercel Cron for background jobs

---

## Monitoring & Logs

### View Deployment Logs
```bash
# Using Vercel CLI
vercel logs --tail

# Or in dashboard: https://vercel.com/[team]/[project]/deployments
```

### Health Check
```bash
curl https://your-api-domain.vercel.app/api/healthz
# Should return: {"status":"healthy"}
```

### Database Connection
```bash
curl -H "Authorization: Bearer $CLERK_SESSION_TOKEN" \
  https://your-api-domain.vercel.app/api/users/me
# Should return user profile (requires valid Clerk token)
```

---

## Continuous Deployment

### Auto-Deploy on Git Push
1. Vercel automatically deploys on push to your GitHub repo
2. Environment variables persist across deployments
3. For database migrations on production schema changes:
   ```bash
   # After updating schema files, run locally first:
   DATABASE_URL="..." pnpm run db:push
   ```

---

## Cost Optimization

### Neon Database
- **Free tier**: Suitable for development (1 project, shared compute)
- **Paid tier**: $14+/month for production with dedicated compute
- Recommended: Start on free, upgrade when needed

### Vercel
- **Free tier**: 100 GB bandwidth/month, 60s function timeout
- **Pro**: $20/month, higher limits
- **Enterprise**: Custom

---

## Security Checklist

- [ ] All environment variables set in Vercel (not in code)
- [ ] Database URL has SSL enabled (`?sslmode=require`)
- [ ] Using production Clerk keys (pk_live_ / sk_live_)
- [ ] OpenRouter API key is secure
- [ ] CORS is configured for your domain
- [ ] Database has backups enabled (check Neon dashboard)
- [ ] Vercel preview deployments have limited database access

---

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Neon Docs**: https://neon.tech/docs
- **Clerk Docs**: https://clerk.com/docs
- **Drizzle Docs**: https://orm.drizzle.team

