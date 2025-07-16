# Refactor Plan: Plug-and-Play Coolify Deployment

**Main Feature/Mandate:**
> The app must be deployable on Coolify (and similar platforms) with minimal or zero configuration. You should be able to point Coolify at the repo and have it run out-of-the-box, just like other plug-and-play Node.js projects.

## Goals
- No complex proxy, container, or domain setup required.
- Works with Coolify's default (Traefik) proxy settings.
- No manual Caddyfile or server-level tweaks.
- One-click deployment from GitHub repo on Coolify, Railway, Render, etc.
- Real-time chat and avatar features remain, but not at the expense of portability.

## Refactor Approach

### 1. **Split Frontend and Backend (if needed)**
- Make frontend a pure static site (React/Vite build output).
- Backend is a simple Node.js/Express/Socket.IO server.
- Both can be deployed separately or together, but must work as a single repo for Coolify.

### 2. **Single Build/Start Command**
- Add a single `start` script in `package.json` that:
    - Builds the frontend
    - Serves the static frontend from the backend (Express)
    - Starts the backend on `process.env.PORT`

### 3. **Coolify Compatibility**
- Ensure backend listens on `process.env.PORT` (Coolify sets this automatically)
- Serve frontend from `/dist` or `/build` directory
- Use relative URLs for Socket.IO client (no hardcoded localhost)
- No custom Nginx/Caddy/Traefik config required

### 4. **Testing**
- Test on local Docker, Coolify, Railway, and Render with no custom config.
- Confirm WebSocket connections work out-of-the-box.

### 5. **Documentation**
- Add clear README instructions for Coolify and other platforms.
- Document any environment variables needed (e.g., `PORT`, `VITE_SOCKET_URL` if needed).

---

## Next Steps
1. Audit current repo for any hardcoded URLs, ports, or proxy dependencies.
2. Refactor as above, prioritizing a single, unified start/build process.
3. Test on Coolify and other platforms.
4. Update documentation.

---

**This plan is focused on maximum portability and zero-hassle deployment.**
If you want to adjust the mandate or add features, update this file before starting the refactor.
