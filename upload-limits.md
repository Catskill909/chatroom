# Audio Upload Limits: Debugging & Fix Documentation

## Problem
- As of 2025-07-24, the chatroom app's audio upload feature is broken for files above ~8-10MB.
- Users receive `MulterError: File too large` and HTTP 500 errors when uploading larger audio files (FLAC, MP3, etc).
- This breakage was introduced during today's coding session.
- Production code (commit 67c5db6) does NOT have this file size limit. The limit is only present in the current dev branch.

## Investigation
- The backend uses `multer` for handling uploads, with a `fileSize` limit set in `server.js`.
- Current dev code sets `fileSize` to 15MB (or lower if default is used), which blocks uploads above this size.
- Express body parser limits may also restrict upload size if not set high enough.
- The correct behavior is to allow uploads up to at least 300MB (for show files and large FLAC/MP3 tracks), as in production.

## Solution
1. **Set `multer` fileSize limit to 300MB** in all relevant upload handlers in `server.js`:
   ```js
   fileSize: 300 * 1024 * 1024 // 300MB
   ```
2. **Set Express body parser limits** to at least 350MB:
   ```js
   app.use(express.json({ limit: '350mb' }));
   app.use(express.urlencoded({ limit: '350mb', extended: true }));
   ```
3. **Restart the backend server** after making these changes.

## Verification
- After applying the fix, test uploading audio files of various sizes (10MB, 50MB, 100MB, 300MB) to confirm successful uploads.
- Confirm no 500 errors or Multer file size errors occur.

## Root Cause
- The file size limit was unintentionally reduced in recent development, breaking the audio upload feature for large files.
- This was not present in the production code (commit 67c5db6).

## Status
- [ ] Fix implemented in dev
- [ ] Fix verified by uploading large files
- [ ] Ready for merge to main/production

---

**If this issue recurs, check both Multer and Express upload limits in `server.js`.**
