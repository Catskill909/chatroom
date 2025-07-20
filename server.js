import express from 'express';
import http from 'http';
import https from 'https';
import fs from 'fs';
import { Server } from 'socket.io';
import multer from 'multer';
import path from 'path';
import cors from 'cors';

const app = express();

// Enable CORS for all HTTP requests
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Initialize __dirname for ES modules
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- AUDIO & COVER UPLOAD SETUP ---
const AUDIO_UPLOAD_DIR = path.join(__dirname, 'uploads', 'audio');
const COVER_UPLOAD_DIR = path.join(__dirname, 'uploads', 'cover');
if (!fs.existsSync(AUDIO_UPLOAD_DIR)) {
    fs.mkdirSync(AUDIO_UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(COVER_UPLOAD_DIR)) {
    fs.mkdirSync(COVER_UPLOAD_DIR, { recursive: true });
}
const audioStorage = multer.diskStorage({
    destination: AUDIO_UPLOAD_DIR,
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});
const coverStorage = multer.diskStorage({
    destination: COVER_UPLOAD_DIR,
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});
const audioUpload = multer({ storage: audioStorage });
const coverUpload = multer({ storage: coverStorage });

// Audio upload endpoint
app.post('/upload/audio', audioUpload.single('audio'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    // Return the public URL for the uploaded file
    const fileUrl = `/uploads/audio/${req.file.filename}`;
    res.json({ url: fileUrl });
});

// Cover art upload endpoint
app.post('/upload/cover', coverUpload.single('cover'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No cover uploaded' });
    }
    const fileUrl = `/uploads/cover/${req.file.filename}`;
    res.json({ url: fileUrl });
});

// Serve uploaded audio files as static
app.use('/uploads/audio', express.static(AUDIO_UPLOAD_DIR));
// Serve uploaded cover images as static
app.use('/uploads/cover', express.static(COVER_UPLOAD_DIR));
// --- END AUDIO & COVER UPLOAD SETUP ---

// Serve frontend static files from /dist
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

    // Handle avatar updates
    socket.on('update_avatar', ({ username, avatar }) => {
        console.log(`[update_avatar] Received request to update avatar for ${username}`);
        console.log(`[update_avatar] Current users:`, Object.values(users).map(u => ({
            username: u.username,
            avatar: u.avatar ? 'has-avatar' : 'no-avatar'
        })));
        
        let found = false;
        // Find and update the user's avatar
        for (const [id, user] of Object.entries(users)) {
            if (user.username === username) {
                users[id] = { ...user, avatar };
                console.log(`[update_avatar] Updated avatar for ${username}`);
                found = true;
                break;
            }
        }
        
        if (!found) {
            console.warn(`[update_avatar] User ${username} not found in users list`);
            return;
        }
        
        // Broadcast the updated users list
        const uniqueUsers = Object.values(users).filter((u, i, arr) => 
            arr.findIndex(other => other.username === u.username) === i
        );
        
        console.log(`[update_avatar] Broadcasting updated users list:`, uniqueUsers.map(u => ({
            username: u.username,
            avatar: u.avatar ? 'has-avatar' : 'no-avatar'
        })));
        
        io.emit('users', uniqueUsers);
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