# Local Development Setup

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
