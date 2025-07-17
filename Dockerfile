# Stage 1: Build
FROM node:20-bookworm AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-bookworm

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev && apt-get update && apt-get upgrade -y && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]