#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔍 Checking for running Node processes...${NC}"
NODE_PROCESSES=$(ps aux | grep -i 'node\|npm' | grep -v grep)

if [ -z "$NODE_PROCESSES" ]; then
    echo -e "${GREEN}✅ No Node processes found${NC}"
else
    echo -e "${RED}⚠️  Running Node processes found:${NC}"
    echo "$NODE_PROCESSES"
    echo -e "${YELLOW}These processes might interfere with development.${NC}"
    
    read -p "❓ Kill these processes? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        pkill -f "node\|npm"
        echo -e "${GREEN}🛑 Killed all Node processes${NC}"
    else
        echo -e "${YELLOW}⚠️  Warning: Continuing with existing processes may cause issues${NC}"
    fi
fi

# Check ports
echo -e "\n${YELLOW}🔍 Checking ports 3000 and 5173...${NC}"
PORT_3000=$(lsof -i :3000)
PORT_5173=$(lsof -i :5173)

if [ -z "$PORT_3000" ] && [ -z "$PORT_5173" ]; then
    echo -e "${GREEN}✅ Both ports (3000 and 5173) are available${NC}"
else
    echo -e "${RED}⚠️  Ports in use:${NC}"
    [ -n "$PORT_3000" ] && echo "Port 3000 (backend):\n$PORT_3000"
    [ -n "$PORT_5173" ] && echo "Port 5173 (frontend):\n$PORT_5173"
    
    echo -e "\n${YELLOW}Run these commands to free the ports:${NC}"
    [ -n "$PORT_3000" ] && echo "lsof -ti :3000 | xargs kill -9"
    [ -n "$PORT_5173" ] && echo "lsof -ti :5173 | xargs kill -9"
fi

echo -e "\n${GREEN}✅ Server check complete. ${NC}"
[ -z "$NODE_PROCESSES" ] && [ -z "$PORT_3000" ] && [ -z "$PORT_5173" ] \
    && echo -e "${GREEN}✨ You're good to start development!${NC}" \
    || echo -e "${YELLOW}⚠️  Please resolve the above issues before continuing${NC}"
