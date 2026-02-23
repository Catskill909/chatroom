#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to handle cleanup
cleanup() {
    echo -e "\n${YELLOW}🚦 Stopping all servers...${NC}"
    pkill -9 -f "node server.js"
    pkill -9 -f "vite"
    echo -e "${GREEN}✅ Servers stopped${NC}"
    exit 0
}

# Set trap to catch Ctrl+C
trap cleanup INT

# 1. Pre-flight check
echo -e "${YELLOW}🔍 Running pre-flight guardrails...${NC}"
./check-servers.sh --auto-fix

# 2. Environment check
if [ ! -f .env ]; then
    echo -e "${YELLOW}📝 .env file missing. Creating from .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ .env created. Please verify its contents if connection issues occur.${NC}"
fi

# 3. Start backend
echo -e "\n${GREEN}🚀 Starting backend server on port 3000...${NC}"
node server.js > server.log 2>&1 &
BACKEND_PID=$!

# Wait for backend health
echo -ne "${YELLOW}⏳ Waiting for backend health check...${NC}"
MAX_RETRIES=10
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:3000/health | grep -q '"status":"ok"'; then
        echo -e "\n${GREEN}✅ Backend is healthy!${NC}"
        break
    fi
    echo -n "."
    sleep 2
    RETRY_COUNT=$((RETRY_COUNT+1))
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "\n${RED}❌ Backend failed to start or report health. Check server.log${NC}"
    kill $BACKEND_PID
    exit 1
fi

# 4. Start frontend
echo -e "\n${GREEN}🚀 Starting frontend development server...${NC}"
npm run dev &
FRONTEND_PID=$!

# Give frontend a moment to start
sleep 3

echo -e "\n${GREEN}✨ ALL SYSTEMS GO! ✨${NC}"
echo -e "------------------------------------"
echo -e "App (Frontend): ${YELLOW}http://localhost:5173${NC}"
echo -e "API (Backend):  ${YELLOW}http://localhost:3000${NC}"
echo -e "Health Check:   ${YELLOW}http://localhost:3000/health${NC}"
echo -e "------------------------------------"
echo -e "${YELLOW}🛑 Press Ctrl+C to stop all servers${NC}"

# Keep script running
wait
