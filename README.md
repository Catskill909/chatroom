# Real-Time Chatroom

A robust, real-time group chatroom with audio and image upload, built with React, TypeScript, Vite, shadcn-ui, and Tailwind CSS. All users see the same chat messages and user list in real time. Audio and image files are uploaded and shared instantly with modern playback and preview features.

## Features

- Real-time chat with instant message delivery
- Audio file upload and streaming playback in chat (with metadata, cover art, and progress bar)
- Custom avatar upload and management for each user
- Image sharing in chat messages with click-to-enlarge modal
- Rich link previews for URLs shared in chat (supports most websites including YouTube, Twitter, and news sites)
- User list with avatars and online status
- Audio notification settings (enable/disable sounds)
- Responsive UI with shadcn-ui and Tailwind CSS
- All state synchronized via backend events (no local-only state)
- Deep logging and error handling

#### Link Previews

The chat automatically detects and displays rich previews for URLs:
- Automatic detection of URLs in messages
- Displays website title, description, and thumbnail image
- Supports most major websites including YouTube, Twitter, news sites, and more
- Click the preview to visit the original page
- Preview updates in real-time for all users

#### Audio & Image Upload

The chat supports audio and image sharing with the following features:
- Click the audio or image icon in the chat input to select a file
- Audio files are uploaded directly (no base64 conversion) with streaming playback
- Smooth audio playback with progress bar and time tracking
- Cover art and metadata are extracted and displayed with audio messages
- Images are automatically resized and optimized
- Maximum file size: 10MB for audio, 5MB for images
- Supported formats: All standard image and audio formats (JPEG, PNG, GIF, MP3, WAV, etc.)
- Images and audio are displayed inline with chat messages

### Account & Notifications

#### Avatar Management
  - Upload a custom avatar (automatically resized and compressed)
  - Avatar updates are synced across all connected clients
  - Supports JPG, PNG, and WebP formats

#### Notification Settings
  - Toggle sound effects for new messages
  - Notification sounds play when receiving new messages (when chat is not focused)
  - Volume control for notification sounds

### Media Viewing

#### Image Gallery
  - Click any image in chat to open it in a full-screen modal
  - Zoom and pan high-resolution images
  - Click outside or press Escape to close

## Architecture

- **Frontend:** React + TypeScript, modular components for chat, user management, avatars, input, audio player, and upload logic
- **Backend:** Node.js server (see `server.js`) manages users, messages, uploads, and avatar data in memory and filesystem
- **Communication:** WebSockets for real-time updates; REST endpoints for file uploads

## 🚨 IMPORTANT: Local & Production Environment Setup

- The backend **always runs on port 3000** (required for Coolify and production).
- You MUST create a `.env` file in the project root before running the app locally.
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

# Build the frontend
npm run build

# Start the backend server (serves both backend and built frontend)
node server.js

# Alternatively, for separate dev frontend:
npm run dev
```

- Open your browser at `http://localhost:3000` (production build) or the port shown in the terminal for dev.

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

## Known Issues


## Further Reading

See [`plan.md`](plan.md:1) for a detailed architecture plan, implementation mandate, and troubleshooting notes.
