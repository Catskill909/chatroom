# Real-Time Chatroom

A robust, real-time group chatroom with audio and image upload, built with React, TypeScript, Vite, shadcn-ui, and Tailwind CSS. All users see the same chat messages and user list in real time. Audio and image files are uploaded and shared instantly with modern playback and preview features.

## Mission: Single-Container, Single Deploy

- One Dockerfile (`Dockerfile.allinone`) builds and runs both the Node app and MongoDB in a single container.
- Zero platform-specific configuration required: no `MONGO_URI` needed; `server.js` defaults to `mongodb://127.0.0.1:27017/chatapp` inside the container.
- Health endpoint at `/health` reports `{ status, mongo }` where `mongo` is `connected|connecting|disconnected`.
- Logs show both processes under Supervisor: look for `mongod ... Waiting for connections` and `Connected to MongoDB` from the app.

## Features

- Real-time chat with instant message delivery
- Audio file upload and streaming playback in chat (with metadata, cover art, and progress bar)
- Custom avatar upload and management for each user
- Image sharing in chat messages with click-to-enlarge modal
- Rich link previews for URLs shared in chat (supports most websites including YouTube etc.)
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

**Audio Player Features:**
- 🎵 **Direct Streaming Playback**: Audio files stream directly without full download
- 🎨 **Rich Metadata Display**: Shows artist, title, and album from audio files
- 🖼️ **Cover Art**: Displays embedded album art when available
- ⏯️ **Playback Controls**: Play/pause, volume control, and seek functionality
- ⏱️ **Time Tracking**: Current position and duration display
- 📈 **Waveform Visualization**: Visual representation of audio waveform
- 🔄 **Live Streaming**: Supports live audio streams with adaptive bitrate
- 📱 **Mobile Optimized**: Touch-friendly controls for all devices
- 📊 **Real Upload Progress**: Visual progress bar shows actual upload status for audio files (0-100%)

**General Media Features:**
- Click the audio or image icon in the chat input to select a file
- Audio files are uploaded directly (no base64 conversion) with streaming playback
- Smooth audio playback with progress bar and time tracking
- Cover art and metadata are extracted and displayed with audio messages
- Images are automatically resized and optimized
- Maximum file size: 10MB for audio, 5MB for images
- Supported formats: All standard image and audio formats (JPEG, PNG, GIF, MP3, WAV, OGG, etc.)
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

## Developer Quickstart Checklist

- Ensure `.env` exists. Minimum:
  - `VITE_SOCKET_URL=http://localhost:3000` (for split dev)
  - `MONGO_URI=mongodb://localhost:27017/chatapp` (if running Mongo locally)
- Start MongoDB (local via Docker): `docker compose up -d mongodb`
- Start backend: `node server.js` (port 3000)
- Start frontend (dev): `npm run dev` (port 5173)
- If using same-origin in production (Coolify), you can omit `VITE_SOCKET_URL`.
- Troubleshoot ports: `./check-servers.sh` and see `startup-server-guide.md`.

## Dev Servers & URLs (Development vs Production)

- Frontend (Vite dev server): usually http://localhost:5173 (Vite may pick 5174/5175 if busy; check terminal output)
- Backend (server.js): http://localhost:3000
- Frontend → Backend socket URL: configured via `.env` `VITE_SOCKET_URL` (dev default: `http://localhost:3000`)
- Production (Coolify/Docker): backend serves static frontend and Socket.IO on port 3000 behind your domain

## User Presence Model (Ephemeral/Non-Persistent)

- Online users are computed from in-memory connections only (no DB reads for presence)
- On join/disconnect, server emits `users` from memory
- Client emits `leave` on tab close (`beforeunload`) for immediate removal
- Server `pingTimeout` is 15s to reduce linger on abrupt closes
- Database persists messages, media, avatars, and last-seen/status for history only

### Test Presence Locally

1. Start backend: `node server.js` (http://localhost:3000)
2. Start frontend: `npm run dev` (visit the printed Vite URL)
3. Open two tabs, join with two usernames
4. Close one tab → the closed user should disappear immediately in the other tab
5. If a tab is force-closed and lingers, it will clear within ~15s

### Troubleshooting

- “Username already taken” right after a crash/force-close: wait ~15s or refresh; the server will drop stale presence
- If UI shows but no chat/users: verify `.env` contains `VITE_SOCKET_URL=http://localhost:3000` in dev

## Docs Index

- Local Dev Guide: `LOCAL_DEV_SETUP.md`
- MongoDB Integration & TTL: `mongodb-setup.md`
- Startup/Ports/Checks: `startup-server-guide.md`
- Docker (local): `docker-compose.yml`
- Docker (Coolify deploy): `docker-compose.coolify.yml`
- Architecture & Roadmap: `plan.md`
- Audio flow and known issues: `audio-feature.md`, `live-audio-upload-errors.md`

## Changelog (2025-08-19)

- OSSPlayer (Azuracast/Icecast corner player) in `src/components/OSSPlayer.tsx`:
  - Implemented EST schedule-based switching via `SHOW_WINDOWS`.
  - On station change, updates `<audio>` `src`, calls `load()`, and auto-resumes `play()` if it was already playing.
  - Countdown shows time until next live start and “Live Now!” during the window.
  - Error fallback: if live errors/stalls, falls back to main and suppresses live retry for 2 minutes to avoid flapping.
  - Chat message audio player is unchanged.

## Azuracast/Icecast Corner Player (OSSPlayer)

- Code: `src/components/OSSPlayer.tsx`
- Streams:
  - Main: `https://supersoul.site:8000/OSS-320`
  - Live: `https://supersoul.site:8010/OSSlive`
- Metadata API: `https://supersoul.site/api/nowplaying` (station id: main=1, live=15)
- Current live schedule (EST):
  - Saturday 20:00–23:59
  - Sunday 00:00–01:00
  - Configured via `SHOW_WINDOWS` in code.
- Behavior:
  - Auto-switches between main/live by schedule; updates the actual audio stream, not just the label.
  - Auto-resumes playback after switch if it was playing.
  - If the live stream fails, falls back to main and retries after ~2 minutes.

### Quick test
1. Start the player and confirm audio.
2. Temporarily add a `SHOW_WINDOWS` window that includes the current time to simulate “Live Now!”
3. Verify the Network tab shows the `<audio>` request switch from `:8000/OSS-320` to `:8010/OSSlive`.
4. Revert the temporary window.

### Next steps (for next testing session)
- Confirm exact EST live windows and station IDs; update `SHOW_WINDOWS` if needed.
- Manually test around a real boundary or simulate as above.
- Optional (later): minimal admin panel to edit schedule windows; simple password auth; store in MongoDB.

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
- `MONGO_URI` MongoDB connection string (e.g. `mongodb://localhost:27017/chatapp` locally, or `mongodb://mongodb:27017/chatapp` inside Docker/Coolify)

#### HTTPS & WebSocket Deployment Notes

- To enable HTTPS, set:
  - `SSL_KEY_PATH` — Path to your SSL private key file (e.g., `/etc/letsencrypt/live/yourdomain.com/privkey.pem`)
  - `SSL_CERT_PATH` — Path to your SSL certificate file (e.g., `/etc/letsencrypt/live/yourdomain.com/fullchain.pem`)
- The server will automatically use HTTPS if both variables are set.
- If deploying frontend and backend on different origins, set `VITE_SOCKET_URL` in your frontend environment to the full wss:// or https:// URL of your backend (e.g., `wss://chat.supersoul.top`).

### Coolify Git-based Deployment (via Docker Compose)

Use the provided `docker-compose.coolify.yml` for GitOps-style deployments that preserve data across updates.

Steps:
- In Coolify: New Resource → Docker Compose → Git Repository.
- Select this repo/branch and set Compose Path to `docker-compose.coolify.yml`.
- Enable Auto Deploy on push (optional).
- Add a Domain to the `app` service. Coolify will proxy to internal port 3000 automatically.
- Issue a TLS certificate in Coolify (Let's Encrypt) for HTTPS/WSS.

What this Compose sets up:
- Service `mongodb` with a named volume `mongodb_data` for persistent DB.
- Service `app` (built from Dockerfile) with a named volume `uploads` mounted at `/app/uploads` so media persists.
- Environment `MONGO_URI=mongodb://mongodb:27017/chatapp` inside `app`.
- Healthchecks for both services. No external DB port is exposed.

Notes:
- You do NOT need to set `VITE_SOCKET_URL` if the frontend and backend run in the same container behind the Coolify domain; the app will use same-origin in production.
- Message retention: MongoDB TTL auto-purges chat messages after 90 days; media files under `uploads/` remain on disk.
- Updates: simply push to Git; Coolify rebuilds and redeploys the `app` service while keeping the `mongodb_data` and `uploads` volumes intact.
- Optional backups: schedule `mongodump` or use Coolify’s backup features for the `mongodb_data` volume.

### All-in-One Single-Container (App + MongoDB)

If you prefer a single container that bundles the Node app and MongoDB, use `Dockerfile.allinone` with `supervisord`.

#### Local quick start

```sh
docker build -f Dockerfile.allinone -t chat-aio .
docker run -d --name chat-aio \
  -p 3000:3000 \
  -v chat_db:/data/db \
  -v chat_uploads:/app/uploads \
  chat-aio

# Verify health
curl -s http://localhost:3000/health
```

Expected response:

```json
{ "status": "ok", "mongo": "connected" }
```

#### Coolify deployment (single Dockerfile)

- New → Application → From Git → set Dockerfile path: `Dockerfile.allinone`.
- Volumes:
  - `/data/db` → persistent volume (MongoDB data)
  - `/app/uploads` → persistent volume (media uploads)
- Env: none required for Mongo; `server.js` defaults `MONGO_URI` to `mongodb://127.0.0.1:27017/chatapp` inside the container.
- Domain → issue TLS.
- Deploy, then open `https://your-domain/health`.

Checklist after deploy:
- Health: `{ status: "ok", mongo: "connected" }`.
- Send a message, upload an image/audio.
- Restart the app → messages remain (Mongo volume) and media persists (`/app/uploads` volume).

#### Troubleshooting (All-in-One Mongo)

- Check logs:
  - Mongo: `Waiting for connections` on `127.0.0.1:27017`.
  - App: `Connected to MongoDB` and `[Mongo] Source: local default 127.0.0.1`.
- If `ECONNREFUSED 127.0.0.1:27017`:
  - Ensure `MONGO_URI` is not set to a different host; leaving it unset uses localhost.
  - Verify `/data/db` is writable (if using volumes, ensure mounts are correct or temporarily disable them to test).
  - On ARM hosts, the all-in-one image auto-selects the correct MongoDB binary (aarch64) — no extra steps needed.
  - The image installs required MongoDB runtime libs (libcurl4, liblzma5, libsnappy1v5, libzstd1, libssl3, libgcc-s1). If you built before 2025-08-21, rebuild to include these.
  - In the container shell, verify the binary and dependencies:
    - `ldd /opt/mongodb/bin/mongod` (check for “not found”)
    - `/opt/mongodb/bin/mongod --version`
    - `nc -z 127.0.0.1 27017 || true` (returns 0 when mongod is listening)
  - Redeploy and re-check `/health`.

If `/health` shows `{ "status": "ok", "mongo": "connecting" }` for more than ~30s, mongod likely failed to start. Collect logs (mongod + app) and confirm the above dependency checks.

Notes:
- Use the Compose method if you want MongoDB as a separate service; use all-in-one for simplicity.
- Retention: messages expire after 90 days via TTL index; media on disk persists until you delete it.
- The all-in-one image auto-detects CPU (amd64/arm64) and downloads the matching MongoDB binary; no platform-specific config.

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
