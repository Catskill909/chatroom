# Audio Cover Art Extraction & Upload: Failure Log and Solutions

## Current Issue (2025-07-18)
- **Cover art upload fails with 404:**
  - `[DEBUG] Preparing to upload cover art: blob:http://localhost:8081/...`
  - `POST http://localhost:3000/upload/cover 404 (Not Found)`
  - `[DEBUG] Cover art upload failed, response: ... <pre>Cannot POST /upload/cover</pre>`
- **Result:** Fallback image used. No cover art shown from audio metadata.
- **Audio upload works:** `/upload/audio` endpoint returns a valid URL and is accessible.
- **Audio metadata extraction works:** Title and artist are extracted, and a Blob URL for cover art is created, but upload fails.

## Known Causes
- Backend `/upload/cover` endpoint is missing, not registered, or not accessible on the running server instance.
- Server.js may have code for `/upload/cover` but it is not being executed (e.g., due to conditional logic, file not saved, or server not restarted).
- Frontend and backend may be running on different ports/servers; CORS or proxy issues may block POST.
- File permissions or path issues on the server may prevent file creation in the cover upload directory.

## Steps to Diagnose
1. **Check server logs** for errors when POSTing to `/upload/cover`.
2. **Verify server.js contains:**
   ```js
   app.post('/upload/cover', coverUpload.single('cover'), (req, res) => {
     if (!req.file) {
       return res.status(400).json({ error: 'No cover uploaded' });
     }
     const fileUrl = `/uploads/cover/${req.file.filename}`;
     res.json({ url: fileUrl });
   });
   ```
3. **Restart the backend server** after any changes to server.js.
4. **Test POST /upload/cover** using curl or Postman to confirm it is accessible:
   ```sh
   curl -F 'cover=@/path/to/image.png' http://localhost:3000/upload/cover
   ```
5. **Check that `/uploads/cover/` directory exists and is writable** by the server process.
6. **Check that the frontend is using the correct backend URL** (VITE_SOCKET_URL).

## Solutions Checklist
- [ ] Ensure `/upload/cover` endpoint is present and correct in server.js
- [ ] Restart backend after editing server.js
- [ ] Confirm POST to `/upload/cover` works from curl/Postman
- [ ] Check server logs for errors on upload
- [ ] Ensure frontend uses backend-served URL, not Blob URL
- [ ] Confirm uploaded cover image is accessible at `/uploads/cover/...`

## Next Steps
- Fix backend `/upload/cover` registration and restart server.
- Confirm upload works and cover art is shown in chat.
- Update this document with any new errors or solutions.
