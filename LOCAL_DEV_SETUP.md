# Local Development Setup

🚨 **CRITICAL: .env FILE REQUIRED FOR LOCAL DEVELOPMENT**

- Before running anything, create a `.env` file in the project root.
- Add this line to your `.env` file:
  
  ```
  VITE_SOCKET_URL=http://localhost:3000
  ```
- If `.env` is missing or blank, the frontend will NOT connect to the backend. You will see the interface but no users or messages.
- If you ever see the UI but no chat/users, check your `.env` first!


### Mission Note (Production)

- Production prefers a single-container deploy using `Dockerfile.allinone` (app + MongoDB in one image).
- For local dev, you typically run Mongo separately (Docker or Homebrew). Only set `MONGO_URI` when your DB is external/local. The all-in-one image does not need `MONGO_URI`.


Follow these steps to run the chat app locally with both frontend and backend:

---

## 1. Install Dependencies

```sh
npm install
```

---

## 2. Environment Variables

- Copy `.env.example` to `.env` and adjust as needed.
- Ensure `VITE_SOCKET_URL` in `.env` points to your backend (default: `/` for same origin).

---

## 3. Start the Backend Server

```sh
node server.js
```
- This starts the Socket.IO backend on the default port (check `server.js` for port config).

---

## 4. Audio Upload, Metadata & Player Troubleshooting

### Buffer Polyfill for Browser (Required for Audio Metadata Extraction)
- The chat app uses `music-metadata-browser` to extract audio metadata (title, artist, album, cover art) client-side.
- **You must install the `buffer` npm package:**
  ```sh
  npm install buffer
  ```
- **Polyfill Buffer in your browser entrypoint (`src/main.tsx`):**
  ```js
  import { Buffer } from 'buffer';
  window.Buffer = Buffer;
  ```
- If you see `ReferenceError: Buffer is not defined` or metadata extraction fails, ensure the above is present and you have reloaded the dev server after installing `buffer`.

### Supported Audio Formats
- `music-metadata-browser` works best with MP3, MP4, M4A, FLAC, OGG, and some WAV files.
- Not all audio files have embedded metadata. Try a different file if extraction fails.

### Audio Player Issues
- The app uses `react-h5-audio-player` for playback in chat bubbles.
- If the audio player is truncated or the scrubber/volume controls do not appear, ensure the correct CSS and `RHAP_UI.VOLUME` is used in the player component.
- If you update dependencies or see player rendering bugs, restart the dev server.

### General Troubleshooting
- If audio uploads fail, check for CORS errors in the browser console and ensure the backend is running and accessible from the frontend.
- If chat messages do not appear, check your `.env` and backend server status.

---

## 4. Start the Frontend (Vite Dev Server)

```sh
npm run dev
```
- This starts the React frontend (Vite) on its default port (usually 5173).

---

## 5. Access the App

- Open your browser at [http://localhost:5173](http://localhost:5173)
- The frontend will connect to the backend via Socket.IO.

---

## Presence Model (Ephemeral, Non-Persistent)

- Online users are computed from the server's in-memory connections only.
- On join/disconnect, server emits the `users` list from memory (DB is not read for presence).
- Client emits `leave` on `beforeunload` so closing a tab removes you instantly.
- Server `pingTimeout` is 15s to clear stale connections quickly on abrupt closes.

Test quickly:
1. Start backend: `node server.js` (http://localhost:3000)
2. Start frontend: `npm run dev` (visit printed Vite URL)
3. Open two tabs, join as two users
4. Close one tab → user should disappear immediately in the other tab

Notes:
- If you force-kill a tab and see "username taken", wait ~15s or refresh; the server will drop the stale presence.
- In dev, `.env` should include `VITE_SOCKET_URL=http://localhost:3000`.

---

## 6. Using MongoDB Locally (Docker)

If you prefer not to install MongoDB directly, use Docker Compose to run only the DB service locally:

```sh
# Start only MongoDB from docker-compose.yml
docker compose up -d mongodb

# Verify Mongo is up
docker compose ps
```

Then set your `.env` for the backend to point to localhost:

```
MONGO_URI=mongodb://localhost:27017/chatapp
```

Start servers as usual:

```sh
node server.js       # backend on port 3000
npm run dev          # frontend on port 5173
```

Data persistence:
- Mongo data is stored in the named volume `mongodb_data` (see `docker-compose.yml`).
- You can stop/start the DB without losing data.

Alternative (full Docker):
- `docker compose up -d` runs both `app` and `mongodb` (production style). This serves the built frontend from the backend at port 3000.
- For dev with Vite HMR, use the split-mode above and only run the `mongodb` service from Docker.

### Alternative: Using MongoDB Locally (Homebrew)

If you prefer native MongoDB without Docker:

```sh
# Install MongoDB Community Edition (macOS)
brew tap mongodb/brew
brew install mongodb-community@7.0

# Start as a background service
brew services start mongodb-community@7.0

# Verify connectivity
mongosh --quiet --eval 'db.runCommand({ ping: 1 })'
```

Set your `.env`:

```
MONGO_URI=mongodb://localhost:27017/chatapp
```

Then run backend and frontend as usual:

```sh
node server.js
npm run dev
```

---

## Notes

- Both servers must be running for full functionality.
- If you change backend ports, update `VITE_SOCKET_URL` in `.env` accordingly.
- For mobile testing, use browser device emulation or access from your phone on the same network.
