# Live Production Audio Upload Errors & Audit

## Summary
Audio upload (cover art and audio file) works in local development, but fails in production. User receives the following errors in production:

- Popup: "Cover art upload failed. Default image will be used."
- Popup: "Audio upload failed. Please try again."
- Console log: Cover art Blob URL and extracted metadata displayed
- Console log: "Preparing to upload cover art: blob:https://chat.supersoul.top/..."
- Network error: `localhost:3000/upload/cover` and `localhost:3000/upload/audio` return `net::ERR_CONNECTION_REFUSED`
- Console log: "Cover art upload failed, using fallback: TypeError: Failed to fetch"
- Console log: "FormData created, uploading to /upload/audio"
- Console log: "Upload error: TypeError: Failed to fetch"

**All of this works perfectly in local dev.**

## Diagnosis Checklist
- [ ] Confirm frontend is using correct backend URL in production (should NOT use localhost)
- [ ] Confirm production server exposes /upload/cover and /upload/audio endpoints
- [ ] Check CORS and proxy configuration for production
- [ ] Inspect network requests in browser devtools for full request URLs and response codes
- [ ] Ensure server is running and accessible on port 3000 in production
- [ ] Review environment variables (`VITE_SOCKET_URL`, etc.) in deployed environment
- [ ] Validate that static asset and API serving order is correct in production
- [ ] Check for firewall, proxy, or SSL issues that might block requests

## Observed Error Flow
1. User selects audio file and (optionally) cover art
2. Frontend extracts metadata and prepares FormData
3. Frontend attempts to POST cover art to `/upload/cover` (URL is `localhost:3000/upload/cover` in prod, which fails)
4. Cover art upload fails, fallback/default image is used
5. Frontend attempts to POST audio file to `/upload/audio` (URL is `localhost:3000/upload/audio` in prod, which fails)
6. Audio upload fails, user sees error popup

## Key Clues
- Network requests in prod are targeting `localhost:3000` instead of the deployed domain (should be `https://chat.supersoul.top`)
- `net::ERR_CONNECTION_REFUSED` means the browser cannot reach the backend at the requested address
- Likely root cause: incorrect environment variable usage or URL construction in production

## Next Steps (Do NOT change code yet)
- [ ] Document all findings and error logs here
- [ ] Review frontend logic for backend URL selection (see `ChatInput.tsx`)
- [ ] Review production `.env` and deployment config for correct `VITE_SOCKET_URL`
- [ ] Confirm backend endpoints are reachable from deployed frontend
- [ ] Only after full audit, plan a safe, incremental fix

## Safety Mandate
- Do NOT attempt any code or config changes until all findings are documented and a stepwise, reversible plan is prepared.
- All fixes must be tested locally before deploying to production.

---

_This file will be updated with every new finding, log, or hypothesis until the production audio upload issue is fully resolved without breaking any other feature._
