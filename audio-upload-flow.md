# Audio Upload & Playback Flow: Full Architecture & Debug Reference

## Purpose
This document provides a crystal-clear, step-by-step description of the audio upload and playback pipeline in the chat app. It is designed to help with:
- Debugging production issues (like failed uploads)
- Onboarding new developers
- Planning enhancements to audio features
- Ensuring future fixes are safe, targeted, and do not break other functionality

---

## 1. User Action: Audio File Selection
- User clicks the audio icon in the chat input.
- File picker dialog opens; user selects an audio file (max 10MB, e.g., MP3, WAV).
- Optionally, user can select or generate cover art.

## 2. Frontend: Metadata Extraction & Preparation
- Frontend (ChatInput.tsx) extracts audio metadata (title, artist, duration, cover art) using browser APIs.
- If cover art is present, it is extracted as a Blob URL.
- Preview of audio and cover art is shown in the chat input before upload.

## 3. Frontend: Upload Logic
- Frontend creates FormData for cover art and audio file.
- Upload endpoints are determined by a helper (getBackendUrl), which uses the environment variable `VITE_SOCKET_URL` in dev, and relative URLs in production.
- Two separate POST requests:
  1. POST `/upload/cover` (if cover art exists)
  2. POST `/upload/audio` (the audio file itself)
- On success, backend returns URLs for uploaded files.
- On failure, fallback/default images are used and user sees error popups.

## 4. Backend: Upload Endpoints (server.js)
- `/upload/cover`: Accepts image uploads, saves to `uploads/cover/`, returns file URL.
- `/upload/audio`: Accepts audio uploads, saves to `uploads/audio/`, returns file URL and metadata.
- CORS and security checks are applied based on environment.

## 5. Frontend: Message Emission
- After successful uploads, frontend emits a chat message via socket.io, including:
  - Audio file URL
  - Cover art URL
  - Metadata (title, artist, duration, etc.)
- Message is broadcast to all clients.

## 6. Frontend: Message Rendering (ChatMessage.tsx)
- If message contains audio, renders a modern audio player with:
  - Play/pause controls
  - Cover art
  - Title/artist display
  - Download button
  - Progress bar
- Audio is streamed from the uploaded file URL.

## 7. Error Handling
- Any upload or playback error is logged and shown to the user.
- Fallback/default images are used if cover art upload fails.
- Messages with missing audio files are gracefully degraded in UI.

---

## 8. Code Path & Click Handler Reference (for Debugging)

### ChatInput.tsx (Frontend)

- **Audio Upload Icon & File Input:**
  ```tsx
  // (Lines ~193-215)
  {audioFile && (
    <div className="mb-3 relative inline-block bg-muted rounded-lg p-3">
      ...
      <Button ... onClick={() => { setAudioFile(null); ... }}>...</Button>
    </div>
  )}
  ...
  <input
    ref={audioInputRef}
    type="file"
    accept="audio/*"
    className="hidden"
    onChange={handleAudioSelect}
  />
  ```
- **Audio File Selection Handler:**
  ```tsx
  // (Function: handleAudioSelect, not shown above, but present in ChatInput.tsx)
  const handleAudioSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate audio type and size
      setAudioFile(file);
      setAudioPreviewUrl(URL.createObjectURL(file));
      // Extract metadata (music-metadata-browser)
      ...
    }
  }
  ```
- **Send Button & Main Upload Logic:**
  ```tsx
  // (Function: handleSend, lines ~55-154)
  const handleSend = async () => {
    // Upload cover art if present
    // Upload audio file
    // Construct message object
    // Call onSendMessage(msgObj)
    ...
  }
  ```
- **Keyboard Shortcut:**
  ```tsx
  // (Function: handleKeyPress, line ~156)
  if (e.key === 'Enter' && !e.shiftKey) handleSend();
  ```

### Chatroom.tsx (Frontend)
- **Message Emission:**
  ```tsx
  // (Function: handleSendMessage)
  const handleSendMessage = async (msg: ChatInputMessage) => {
    if (msg.audioPreviewUrl) {
      const audioMessage: Message = { ... };
      socket.emit("message", audioMessage);
      return;
    }
    ...
  }
  ```

### server.js (Backend)
- **Audio Upload Endpoint:**
  ```js
  // (Express route handler)
  app.post('/upload/audio', upload.single('audio'), (req, res) => {
    // Save file to uploads/audio/
    // Respond with URL
    ...
  });
  ```
- **Cover Art Upload Endpoint:**
  ```js
  app.post('/upload/cover', upload.single('cover'), (req, res) => {
    // Save file to uploads/cover/
    // Respond with URL
    ...
  });
  ```

---

## Debugging Checklist
- [ ] Confirm frontend is constructing correct upload URLs (see getBackendUrl in ChatInput.tsx)
- [ ] Confirm backend endpoints are accessible from deployed frontend
- [ ] Check CORS, environment variables, and server logs for errors
- [ ] Test uploads and playback in both local and production
- [ ] Document all new findings in `live-audio-upload-errors.md`

---

## Next Steps
- Use this doc as the canonical reference for all future audio feature debugging and development.
- Update as the architecture evolves or new bugs are discovered.
