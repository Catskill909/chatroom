# Real-Time Chatroom

A robust, real-time group chatroom with custom avatar upload, built with React, TypeScript, Vite, shadcn-ui, and Tailwind CSS. All users see the same chat messages and user list in real time. Avatars are uploaded as base64 strings and shared across all clients.

## Features

- Real-time chat with instant message delivery
- Custom avatar upload and display for each user
- Image sharing in chat messages with automatic resizing
- User list with avatars
- Responsive UI with shadcn-ui and Tailwind CSS
- All state synchronized via backend events (no local-only state)
- Deep logging and error handling

## Image Upload

The chat supports image sharing with the following features:
- Click the image icon in the chat input to select an image
- Images are automatically resized and optimized
- Maximum file size: 5MB
- Supported formats: All standard image formats (JPEG, PNG, GIF, etc.)
- Images are displayed inline with chat messages

## Architecture

- **Frontend:** React + TypeScript, modular components for chat, user management, avatars, and input
- **Backend:** Node.js server (see `server.js`) manages users, messages, and avatar data in memory
- **Communication:** WebSockets for real-time updates

## 🚨 IMPORTANT: Local Environment Setup

**You MUST create a `.env` file in the project root before running the app locally.**

- The `.env` file is NOT tracked by git and must be created by each developer.
- Add this line to your `.env` file:
  
  ```
  VITE_SOCKET_URL=http://localhost:3000
  ```
- If `.env` is missing or blank, the frontend will NOT connect to the backend. You will see the interface but no users or messages.
- If you ever see the UI but no chat/users, check your `.env` first!

---

## Setup & Usage

### Prerequisites

- Node.js & npm installed ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))

### Local Development

```sh
# Clone the repository
git clone https://github.com/Catskill909/chatroom.git

# Navigate to the project directory
cd chatroom

# Install dependencies
npm install

# Start the backend server
node server.js

# In a separate terminal, start the frontend dev server
npm run dev
```

- Open your browser at `http://localhost:5173` (or the port shown in the terminal).

### Project Structure

- `src/components/` — React components for chatroom, messages, avatars, user modal, etc.
- `server.js` — Node.js backend for real-time communication and state management
- `plan.md` — Architecture plan and implementation notes

## Technologies Used

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Node.js (backend)

## Deployment

### Production Deployment with Docker (Coolify, etc.)

This app is fully production-ready and tested at [https://chat.supersoul.top](https://chat.supersoul.top).

**Recommended: Use the provided multi-stage Dockerfile for deployment.**

#### Dockerfile (multi-stage, secure, production-ready)

```Dockerfile
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
```

- Exposes port 3000 (default, see `server.js`).
- Installs all build tools only in the build stage, keeping the runtime image small and secure.
- Works with Coolify, Docker, and most modern PaaS.

#### Environment Variables

- `PORT` (default: 3000)
- `SSL_KEY_PATH` and `SSL_CERT_PATH` for HTTPS (see below)
- `VITE_SOCKET_URL` for frontend-to-backend WebSocket URL (set to `https://chat.supersoul.top` in production)

#### HTTPS & WebSocket Deployment Notes

- To enable HTTPS, set:
  - `SSL_KEY_PATH` — Path to your SSL private key file (e.g., `/etc/letsencrypt/live/yourdomain.com/privkey.pem`)
  - `SSL_CERT_PATH` — Path to your SSL certificate file (e.g., `/etc/letsencrypt/live/yourdomain.com/fullchain.pem`)
- The server will automatically use HTTPS if both variables are set.
- If deploying frontend and backend on different origins, set `VITE_SOCKET_URL` in your frontend environment to the full wss:// or https:// URL of your backend (e.g., `wss://chat.supersoul.top`).

#### Generating Self-Signed Certificates (for testing)

```sh
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=localhost"
```
Then set:
- `SSL_KEY_PATH=./key.pem`
- `SSL_CERT_PATH=./cert.pem`

#### Troubleshooting

- Browsers will block insecure WebSocket (ws://) connections from HTTPS pages. Always use HTTPS/WSS in production.
- Ensure your certificates are valid and readable by the server process.

### Project Structure

- `src/components/` — React components for chatroom, messages, avatars, user modal, etc.
- `server.js` — Node.js backend for real-time communication and state management
- `plan.md` — Architecture plan and implementation notes

## Further Reading

See [`plan.md`](plan.md:1) for a detailed architecture plan, implementation mandate, and troubleshooting notes.
