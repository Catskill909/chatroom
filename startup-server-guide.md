# 🚀 Server Startup Guide

> ⚠️ **CRITICAL FIRST STEP - ALWAYS CHECK FOR RUNNING SERVERS**
> Before starting ANY development session, run these checks:
> ```bash
> # Check for running Node processes
> ps aux | grep -i 'node\|npm' | grep -v grep
> 
> # Check ports 3000 and 5173
> lsof -i :3000 -i :5173
> 
> # Kill any running instances if needed
> pkill -f "node server.js"
> pkill -f "vite"
> ```
> Multiple server instances will cause hard-to-debug issues. ALWAYS verify first!

## ✅ Pre-Flight Checklist (MANDATORY)

1. **Check for Running Servers**
   ```bash
   # Run this in your terminal before starting development
   ./check-servers.sh
   ```
   This script will:
   - Detect running Node/Vite processes
   - Show which ports are in use
   - Offer to stop conflicting processes

2. **Verify Ports Are Free**
   ```bash
   # Should return nothing if ports are free
   lsof -i :3000 -i :5173
   ```

3. **Clear Previous Builds**
   ```bash
   rm -rf node_modules/.vite  # Clear Vite cache
   ```

## 🚀 Quick Start (Local Development)

1. **Install Dependencies**
   ```sh
   npm install
   ```

2. **Set Up Environment**
   ```sh
   cp .env.example .env
   # Edit .env if needed:
   # - VITE_SOCKET_URL should point to your backend (or leave unset for same-origin in prod)
   # - MONGO_URI e.g. mongodb://localhost:27017/chatapp (or mongodb://mongodb:27017/chatapp in Docker)
   ```

3. **Start Backend (Port 3000 - REQUIRED for Coolify)**
   ```sh
   node server.js
   ```
   - This MUST run on port 3000 for Coolify compatibility
   - Verify: http://localhost:3000 should show "Cannot GET /" (this is expected)

4. **Start Frontend (Default: Port 5173)**
   ```sh
   npm run dev
   ```
   - Access at: http://localhost:5173

---

## 🌐 Coolify Deployment Notes

### Critical Requirements
- Backend MUST run on port 3000
- Environment variables are managed through Coolify
- No need to build locally - Coolify handles this

### Local Testing (Matching Production)
To test with production-like settings locally:
```sh
# In one terminal
node server.js  # Runs on port 3000

# In another terminal
VITE_SOCKET_URL=/ npm run dev  # Uses relative path for socket connection
```

---

## 🛠️ Server Management Scripts

### 1. check-servers.sh
```bash
#!/bin/bash

# Check for Node processes
echo "🔍 Checking for running Node processes..."
NODE_PROCESSES=$(ps aux | grep -i 'node\|npm' | grep -v grep)

if [ -z "$NODE_PROCESSES" ]; then
    echo "✅ No Node processes found"
else
    echo "⚠️  Running Node processes found:"
    echo "$NODE_PROCESSES"
    read -p "❓ Kill these processes? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        pkill -f "node\|npm"
        echo "🛑 Killed all Node processes"
    fi
fi

# Check ports
echo "\n🔍 Checking ports 3000 and 5173..."
lsof -i :3000 -i :5173

echo "\n✅ Server check complete. Safe to start development servers."
```

Make it executable:
```bash
chmod +x check-servers.sh
```

### 2. start-dev.sh
```bash
#!/bin/bash

# First, run the check
./check-servers.sh

# Start backend
node server.js &
BACKEND_PID=$!

echo "Backend started (PID: $BACKEND_PID)"

# Start frontend
npm run dev &
FRONTEND_PID=$!

echo "Frontend started (PID: $FRONTEND_PID)"
echo "\n🛑 To stop all servers: kill $BACKEND_PID $FRONTEND_PID"
```

## 🔧 Troubleshooting

### Port 3000 Already in Use?
```sh
# On Mac/Linux
lsof -i :3000
kill -9 <PID>

# On Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Frontend Not Connecting to Backend?
1. Check backend is running: `curl http://localhost:3000`
2. Verify `.env` has correct `VITE_SOCKET_URL`
3. Check browser console for errors

---

## 🛑 Stopping Servers

```sh
# Stop frontend (Ctrl+C in its terminal)
# Stop backend (Ctrl+C in its terminal)

# Or find and kill all Node processes:
pkill -f node  # Mac/Linux
taskkill /f /im node.exe  # Windows
```

---

## 🔄 Development Workflow

1. Make code changes
2. Frontend auto-reloads (Vite HMR)
3. Backend requires restart on changes:
   ```sh
   # After making backend changes
   pkill -f "node server.js"  # Stop existing
   node server.js            # Start fresh
   ```

---

## 📌 Important Notes

- Always test with port 3000 locally before pushing to Coolify
- The frontend port (5173) is only for development
- In production, Coolify handles routing and SSL
- Never commit `.env` files to version control
