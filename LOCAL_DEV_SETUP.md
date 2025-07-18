# Local Development Setup

🚨 **CRITICAL: .env FILE REQUIRED FOR LOCAL DEVELOPMENT**

- Before running anything, create a `.env` file in the project root.
- Add this line to your `.env` file:
  
  ```
  VITE_SOCKET_URL=http://localhost:3000
  ```
- If `.env` is missing or blank, the frontend will NOT connect to the backend. You will see the interface but no users or messages.
- If you ever see the UI but no chat/users, check your `.env` first!


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

## Notes

- Both servers must be running for full functionality.
- If you change backend ports, update `VITE_SOCKET_URL` in `.env` accordingly.
- For mobile testing, use browser device emulation or access from your phone on the same network.
