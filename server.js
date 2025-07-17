import express from 'express';
import http from 'http';
import https from 'https';
import fs from 'fs';
import { Server } from 'socket.io';

const app = express();

// Serve frontend static files from /dist
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'dist')));

let server;
if (process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH) {
    const key = fs.readFileSync(process.env.SSL_KEY_PATH);
    const cert = fs.readFileSync(process.env.SSL_CERT_PATH);
    server = https.createServer({ key, cert }, app);
    console.log('HTTPS server enabled');
} else {
    server = http.createServer(app);
    console.log('HTTP server enabled');
}
const io = new Server(server, {
    cors: { origin: '*' }
});

let users = {};
let messages = [];

io.on('connection', (socket) => {
    console.log(`[connect] ${socket.id}`);

    // Catch-all event logger for debugging
    socket.onAny((event, ...args) => {
        console.log(`[backend] onAny event:`, event, args);
    });

    // Send full state to new client
    socket.emit('users', Object.values(users));
    socket.emit('history', messages);
    console.log(`[emit] users ->`, Object.values(users));
    console.log(`[emit] history ->`, messages);

    socket.on('join', ({ username, avatar }) => {
        // Enforce unique usernames
        const nameTaken = Object.values(users).some(u => u.username === username);
        if (nameTaken) {
            socket.emit('join_error', { message: 'Username already taken. Please choose another.' });
            console.log(`[backend] join rejected for duplicate username: ${username}`);
            return;
        }
        users[socket.id] = { username, avatar, isOnline: true };
        // Emit only unique usernames to clients
        const uniqueUsers = Object.values(users).filter((u, i, arr) => arr.findIndex(other => other.username === u.username) === i);
        io.emit('users', uniqueUsers);
        console.log(`[emit] users ->`, uniqueUsers);
    });

    socket.on('message', (msg) => {
        console.log(`[recv] message received from ${socket.id}`);

        // Check if message contains an image and log accordingly
        if (msg.image) {
            console.log(`[recv] message with image, image data length: ${msg.image.length}`);
            console.log(`[recv] image data starts with: ${msg.image.substring(0, 50)}...`);
        } else {
            console.log(`[recv] text-only message: "${msg.content}"`);
        }

        messages.push(msg);
        io.emit('message', msg);
        console.log(`[emit] broadcasted message to all clients`);
    });

    socket.on('disconnect', () => {
        if (users[socket.id]) {
            console.log(`[disconnect] ${users[socket.id].username} (${socket.id})`);
            delete users[socket.id];
            // Emit only unique usernames to clients
            const uniqueUsers = Object.values(users).filter((u, i, arr) => arr.findIndex(other => other.username === u.username) === i);
            io.emit('users', uniqueUsers);
            console.log(`[emit] users ->`, uniqueUsers);
        }
    });

    socket.on('error', (err) => {
        console.error(`[socket error]`, err);
    });
});

// Catch-all: serve index.html for any unknown routes (for React Router), but do not intercept WebSocket upgrade requests
app.get('*', (req, res, next) => {
    if (req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket') {
        return next();
    }
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`WebSocket server running on port ${PORT}`);
});