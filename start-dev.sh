#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to handle cleanup
cleanup() {
    echo -e "\n${YELLOW}🚦 Stopping all servers...${NC}"
    pkill -f "node server.js"
    pkill -f "vite"
    echo -e "${GREEN}✅ Servers stopped${NC}"
    exit 0
}

# Set trap to catch Ctrl+C
trap cleanup INT

# Run the server check first
echo -e "${YELLOW}🔍 Running pre-flight check...${NC}"
./check-servers.sh

# Ask for confirmation
echo -e "\n${YELLOW}⚠️  This will start the development servers. Continue? (y/n)${NC}"
read -n 1 -r
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "\n${YELLOW}🚫 Operation cancelled${NC}"
    exit 1
fi

# Start backend
echo -e "\n${GREEN}🚀 Starting backend server on port 3000...${NC}
node server.js &
BACKEND_PID=$!
echo -e "Backend PID: $BACKEND_PID"

# Give backend a moment to start
sleep 2

# Start frontend
echo -e "\n${GREEN}🚀 Starting frontend development server...${NC}
npm run dev &
FRONTEND_PID=$!
echo -e "Frontend PID: $FRONTEND_PID"

# Show status
echo -e "\n${GREEN}✅ Development servers started${NC}"
echo -e "Backend: http://localhost:3000"
echo -e "Frontend: http://localhost:5173"
echo -e "\n${YELLOW}🛑 Press Ctrl+C to stop all servers${NC}"

# Wait for both processes
echo -e "\n${YELLOW}📡 Server logs will appear below:${NC}"
wait $BACKEND_PID $FRONTEND_PID
