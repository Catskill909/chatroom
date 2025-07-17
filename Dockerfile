# Use the official Node.js LTS Debian image for maximum security patching
FROM node:20-bookworm

WORKDIR /app

COPY package*.json ./
RUN apt-get update && apt-get upgrade -y && npm install --production && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["node", "server.js"]