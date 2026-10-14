# Deployment Guide — Employee Management System

## Quick Start

This project uses a split deployment:
- **Frontend** → Vercel (React/Vite SPA)
- **Backend** → Railway (Express.js + Socket.IO)
- **Database** → Railway MySQL

## Prerequisites

1. GitHub account (code push చేయడానికి)
2. Railway account — [railway.app](https://railway.app) (Free tier available)
3. Vercel account — [vercel.com](https://vercel.com) (Free tier available)

---

## Step 1: Push Code to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## Step 2: Railway — MySQL Database

1. Railway Dashboard → **New Project** → **Provision MySQL**
2. Click MySQL service → **Data** tab → **Query** tab
3. Paste contents of `database/schema.sql` (remove `CREATE DATABASE` and `USE` lines) → Run
4. Paste contents of `database/seed.sql` → Run

## Step 3: Railway — Backend Deploy

1. Railway Dashboard → **New Service** → **GitHub Repo**
2. Select your repo, set **Root Directory** = `backend`
3. Add environment variables (see below)
4. Railway auto-deploys from main branch

### Required Environment Variables

```
PORT=5000
NODE_ENV=production
DB_HOST=${{MySQL.MYSQL_HOST}}
DB_PORT=${{MySQL.MYSQL_PORT}}
DB_USER=${{MySQL.MYSQL_USER}}
DB_PASSWORD=${{MySQL.MYSQL_PASSWORD}}
DB_NAME=${{MySQL.MYSQL_DATABASE}}
JWT_SECRET=your_random_secret_min_32_chars
JWT_EXPIRES_IN=7d
CLIENT_URL=https://your-frontend.vercel.app
LEAVE_ALLOWANCE_DAYS=24
```

4. Settings → Networking → **Generate Domain**
5. Test: `https://YOUR_RAILWAY_URL/api/health`

## Step 4: Vercel — Frontend Deploy

1. Update `frontend/.env.production`:
   ```
   VITE_API_URL=https://YOUR_RAILWAY_URL/api
   VITE_SOCKET_URL=https://YOUR_RAILWAY_URL
   ```
2. Vercel Dashboard → **Add New Project** → Select GitHub repo
3. **Root Directory** = `frontend`, **Framework** = `Vite`
4. Add env vars: `VITE_API_URL` and `VITE_SOCKET_URL`
5. Deploy

## Step 5: Update Railway CLIENT_URL

After Vercel deploy, copy your Vercel URL and update Railway backend:
```
CLIENT_URL=https://your-app.vercel.app
```

## Verify

- Backend health: `https://YOUR_RAILWAY_URL/api/health`
- Frontend: `https://YOUR_VERCEL_URL` → Login
