# Audio Stream Fix Log

**Goal:** Achieve reliable, CORS-safe audio streaming for the OSSPlayer in both local and production environments, matching the working behavior of the legacy player in `audio/index.html` and using `audio/proxy.php`.

---

## 1. Problem Summary
- Audio metadata works everywhere, but live audio streaming fails in production (works locally).
- Error: `NotSupportedError: The element has no supported sources.`
- Proxy (`audio/proxy.php`) and legacy player (`audio/index.html`) both work as standalone.
- React/OSSPlayer fails to play audio in production, even when using the proxy.

---

## 2. Troubleshooting Attempts

### a. Direct Stream URL (Local)
- `https://supersoul.site:8000/OSS-320` (works locally)
- Fails in production due to CORS.

### b. Proxy with `url=` Param (React Player)
- `/audio/proxy.php?url=https://supersoul.site:8000/OSS-320`
- **FAILED:** Proxy expects `stream=OSS-320` param, not `url=`. Returns error page, not audio.

### c. Proxy with `stream=` Param (React Player, Current)
- `/audio/proxy.php?stream=OSS-320`
- **STILL FAILS in production React app:**
    - Error: `NotSupportedError: The operation is not supported.`
    - Proxy works when accessed directly in browser.
    - Audio element in React refuses to play.

### d. Reference: Legacy Player (audio/index.html)
- Uses `/audio/proxy.php?stream=OSS-320` and works in browser.
- Uses `<audio>` tag with `crossorigin="anonymous"`.
- No special headers or tricks.

---

## 3. Reference: Working Files

### [audio/index.html]
- Uses `<audio id="oss-audio" src="/audio/proxy.php?stream=OSS-320" ...>`
- Works in all environments.

### [audio/proxy.php]
- Accepts `stream` param, maps to upstream stream, sets `Content-Type: audio/mpeg`, CORS headers, disables cache, streams with cURL.
- Works when accessed directly.

---

## 4. Remaining Theories
- **URL in React app may be incorrect or not matching exactly what works in index.html.**
- **React/OSSPlayer may be adding extra params, headers, or not setting `crossOrigin` properly.**
- **Build tool (Vite, etc.) or server config may be interfering with `/audio/proxy.php` requests.**
- **There may be a difference in how the audio element is created/attached in React vs plain HTML.**

---

## 5. Next Steps
1. **Compare the exact `<audio>` element in React vs index.html.**
2. **Ensure the `src` is `/audio/proxy.php?stream=OSS-320` (no extra params, no hash, no cache-busting).**
3. **Test `/audio/proxy.php?stream=OSS-320` directly in browser (should prompt download or play audio).**
4. **Check network tab in browser dev tools for Content-Type, response, and errors.**
5. **Try hardcoding the player in React to exactly match index.html markup.**
6. **Check for any build or server rewrites interfering with PHP proxy.**

---

## 6. Action Items
- [ ] Confirm React `<audio>` markup matches index.html exactly (attributes, src, etc.).
- [ ] Confirm no extra params or cache-busting is added to the proxy URL.
- [ ] Test proxy URL in browser and in React.
- [ ] Document any differences found.
- [ ] If still failing, try rendering a raw HTML `<audio>` element in React to rule out React-specific issues.

---

## 7. Log
- (Add each new troubleshooting step and result here)

---

*This doc is maintained to avoid repeating failed attempts and to serve as a single source of truth for the audio streaming issue.*
