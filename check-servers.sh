#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for --auto-fix flag
AUTO_FIX=false
if [[ "$1" == "--auto-fix" ]]; then
    AUTO_FIX=true
fi

echo -e "${YELLOW}🔍 Checking for running Node/Vite processes...${NC}"
NODE_PROCESSES=$(ps aux | grep -i 'node\|npm\|vite' | grep -v grep)

if [ -n "$NODE_PROCESSES" ]; then
    echo -e "${RED}⚠️  Running Node/Vite processes found.${NC}"
    if [ "$AUTO_FIX" = true ]; then
        echo -e "${YELLOW}🚀 Auto-fixing: Killing all Node/Vite processes...${NC}"
        pkill -9 -f "node\|npm\|vite"
    else
        echo "$NODE_PROCESSES"
        echo -e "${YELLOW}These processes might interfere with development.${NC}"
        read -p "❓ Kill these processes? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            pkill -9 -f "node\|npm\|vite"
            echo -e "${GREEN}🛑 Killed all Node processes${NC}"
        else
            echo -e "${YELLOW}⚠️  Warning: Continuing with existing processes may cause issues${NC}"
        fi
    fi
else
    echo -e "${GREEN}✅ No conflicting Node processes found${NC}"
fi

# Check ports
echo -e "\n${YELLOW}🔍 Checking ports 3000 and 5173...${NC}"
PORT_3000=$(lsof -ti :3000)
PORT_5173=$(lsof -ti :5173)

if [ -n "$PORT_3000" ] || [ -n "$PORT_5173" ]; then
    echo -e "${RED}⚠️  Ports in use detected.${NC}"
    if [ "$AUTO_FIX" = true ]; then
        echo -e "${YELLOW}🚀 Auto-fixing: Clearing ports 3000 and 5173...${NC}"
        [ -n "$PORT_3000" ] && kill -9 $PORT_3000
        [ -n "$PORT_5173" ] && kill -9 $PORT_5173
        echo -e "${GREEN}✅ Ports cleared${NC}"
    else
        [ -n "$PORT_3000" ] && echo "Port 3000 (backend) is in use by PID(s): $PORT_3000"
        [ -n "$PORT_5173" ] && echo "Port 5173 (frontend) is in use by PID(s): $PORT_5173"
        echo -e "\n${YELLOW}Run './check-servers.sh --auto-fix' to clear them automatically.${NC}"
    fi
else
    echo -e "${GREEN}✅ Both ports (3000 and 5173) are available${NC}"
fi

echo -e "\n${GREEN}✅ Server check complete. ${NC}"
if [ -z "$(lsof -ti :3000)" ] && [ -z "$(lsof -ti :5173)" ]; then
    echo -e "${GREEN}✨ You're good to start development!${NC}"
else
    echo -e "${YELLOW}⚠️  Please resolve the above issues before continuing${NC}"
    exit 1
fi
