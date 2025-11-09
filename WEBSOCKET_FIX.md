# 🚀 WebSocket Fix Deployment Guide

## Problem Fixed
The app was trying to connect to `localhost:3000` in production because `VITE_SOCKET_URL` was hardcoded.

## Solution Applied
Updated `src/components/Chatroom.tsx` with smart URL detection that:
- Uses localhost in development 
- Ignores localhost URLs in production
- Auto-detects production domain

## Deployment Steps

### 1. Push to Git (triggers Coolify deployment)
```bash
git add .
git commit -m "Fix WebSocket production connection - auto-detect domain"
git push origin main
```

### 2. Configure Coolify Environment (Choose one option)

**Option A (Recommended): Let app auto-detect domain**
- In Coolify dashboard → Environment Variables
- **Remove** or **don't set** `VITE_SOCKET_URL`
- App will automatically use `https://your-domain.com`

**Option B: Set explicit production URL**
- In Coolify dashboard → Environment Variables  
- Set: `VITE_SOCKET_URL=https://your-production-domain.com`

### 3. Verify Fix
After deployment, check browser console - should see:
```
[socket] connected <socket-id>
```
Instead of connection errors.

## Local Development
Your local `.env` still has:
```
VITE_SOCKET_URL=http://localhost:3000
```
This is correct for local development.