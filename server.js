import express from 'express';
import http from 'http';
import https from 'https';
import fs from 'fs';
import { Server } from 'socket.io';
import multer from 'multer';
import path from 'path';
import cors from 'cors';
import { getLinkPreview } from 'link-preview-js';
import 'dotenv/config';

import mongoose from 'mongoose';

const app = express();

// Get port from environment variable or use 3000 as default
const PORT = process.env.PORT || 3000;

// Allowed origins for CORS, configurable via environment
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '*')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
const IS_WILDCARD_ORIGIN = (ALLOWED_ORIGINS.length === 1 && ALLOWED_ORIGINS[0] === '*');
const CORS_ORIGIN = IS_WILDCARD_ORIGIN ? '*' : ALLOWED_ORIGINS;
const CORS_CREDENTIALS = !IS_WILDCARD_ORIGIN;

// Enable CORS for HTTP requests
app.use(cors({
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: CORS_CREDENTIALS
}));

// Handle preflight requests
app.options('*', cors());

// Simple health endpoint for container/orchestrator checks
app.get('/health', (_req, res) => {
    // Map mongoose readyState to human-readable
    const mapState = (state) => {
        switch (state) {
            case 1: return 'connected';
            case 2: return 'connecting';
            case 3: return 'disconnecting';
            case 0:
            default: return 'disconnected';
        }
    };
    const readyState = mongoose?.connection?.readyState ?? 0;
    const mongo = mapState(readyState);
    const status = (process.env.MONGO_URI && mongo !== 'connected') ? 'degraded' : 'ok';
    res.status(200).json({ status, mongo });
});

// Initialize __dirname for ES modules
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- DATABASE (MongoDB) SETUP ---
// Default to localhost for single-container (all-in-one) deployments.
// In Compose/multi-service setups, MONGO_URI should point to the service hostname.
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/chatapp';
const USING_ENV_MONGO = Boolean(process.env.MONGO_URI);
console.log(`[Mongo] Source: ${USING_ENV_MONGO ? 'env MONGO_URI' : 'local default 127.0.0.1'}`);

async function connectWithRetry() {
    try {
        await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('MongoDB connection error:', err.message || err);
        setTimeout(connectWithRetry, 3000);
    }
}
connectWithRetry();

const messageSchema = new mongoose.Schema({
    id: { type: String, required: true, index: true },
    username: { type: String, required: true },
    content: { type: String, default: '' },
    // Client-provided timestamp used for UI display
    timestamp: { type: Date, default: Date.now },
    // Server-side creation time for TTL expiry
    createdAt: { type: Date, default: Date.now },
    avatar: { type: String },
    image: { type: String },
    audio: { type: String },
    audioMeta: {
        title: { type: String },
        artist: { type: String },
        album: { type: String },
        coverUrl: { type: String }
    },
    reactions: { type: Map, of: [String], default: {} }
}, { versionKey: false, minimize: false });

// Purge messages automatically after 90 days (does not affect uploaded files)
messageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

const Message = (mongoose.models && mongoose.models.Message) || mongoose.model('Message', messageSchema);

// Users schema/model (Step 2)
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    avatar: { type: String },
    status: { type: String, enum: ['online', 'away', 'offline'], default: 'offline' },
    lastSeen: { type: Date, default: null }
}, { versionKey: false, timestamps: true });

const User = (mongoose.models && mongoose.models.User) || mongoose.model('User', userSchema);
mongoose.connection.once('open', async () => {
    try {
        await Message.syncIndexes();
        console.log('Message indexes synced');
        await User.syncIndexes();
        console.log('User indexes synced');
    } catch (e) {
        console.error('Error syncing Message indexes:', e);
    }
});
// --- END DATABASE SETUP ---

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
// Configure multer with file size limits (15MB to be safe)
const multerOptions = {
    storage: audioStorage,
    limits: {
        fileSize: 300 * 1024 * 1024, // 300MB limit per file
        files: 1
    }
};

const audioUpload = multer(multerOptions);
const coverUpload = multer({
    storage: coverStorage,
    limits: {
        fileSize: 300 * 1024 * 1024, // 300MB limit per file
        files: 1
    }
});

// Increase the request size limit
app.use(express.json({ limit: '350mb' }));
app.use(express.urlencoded({ limit: '350mb', extended: true }));

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

// Proxy audio stream for Safari CORS/redirect bug workaround
import fetch from 'node-fetch';

app.get('/stream/:id', async (req, res) => {
    const streamId = req.params.id;
    // Append ?_ic2=1 to prevent Icecast Safari redirect
    const streamUrl = `https://supersoul.site:8000/${streamId}?_ic2=1`;
    const controller = new AbortController();
    // Abort upstream fetch when client disconnects
    req.on('close', () => controller.abort());
    try {
        const streamRes = await fetch(streamUrl, { signal: controller.signal });
        if (!streamRes.ok) {
            res.status(streamRes.status).send('Failed to fetch stream');
            return;
        }
        res.setHeader('Content-Type', streamRes.headers.get('content-type') || 'audio/mpeg');
        // Pipe audio data and clean up on close
        streamRes.body.pipe(res);
        res.on('close', () => { try { streamRes.body?.destroy?.(); } catch { } });
    } catch (err) {
        if (err.name === 'AbortError') return; // Client disconnected, expected
        res.status(500).send('Stream proxy error');
    }
});

// Add link preview endpoint
app.get('/api/link-preview', async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'URL parameter is required' });
    }

    try {
        const preview = await getLinkPreview(url, {
            timeout: 5000,
            followRedirects: 'follow',
            handleRedirects: (baseURL, forwardedURL) => {
                console.log(`[Link Preview] Redirecting from ${baseURL} to ${forwardedURL}`);
                return true; // Allow all redirects
            },
            headers: {
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'accept-language': 'en-US,en;q=0.5',
            },
        });

        console.log(`[Link Preview] Successfully fetched preview for ${url}`);
        res.json(preview);
    } catch (error) {
        console.error(`[Link Preview] Error fetching preview for ${url}:`, error);
        res.status(500).json({
            error: 'Failed to fetch link preview',
            details: error.message
        });
    }
});

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
    cors: {
        origin: CORS_ORIGIN,
        methods: ['GET', 'POST'],
        credentials: CORS_CREDENTIALS
    },
    maxHttpBufferSize: 20 * 1024 * 1024, // 20MB max payload size
    pingTimeout: 15000, // Shorter timeout to reduce presence linger
    pingInterval: 25000, // Send pings every 25 seconds
    connectTimeout: 60000, // Increase connection timeout to 60 seconds
    transports: ['websocket', 'polling'], // Enable both transports
    allowEIO3: true, // Enable Engine.IO v3 compatibility
    allowUpgrades: true,
    perMessageDeflate: {
        threshold: 1024, // Compress messages larger than 1KB
        zlibDeflateOptions: {
            level: 9
        }
    },
    httpCompression: true
});

let users = {};
let messages = [];

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const ADMIN_SESSION_TIMEOUT_MS = Number(process.env.ADMIN_SESSION_TIMEOUT_MS || 60 * 60 * 1000);
const adminSessions = new Map();
const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

// Periodic cleanup of stale login attempts and expired admin sessions
setInterval(() => {
    const now = Date.now();
    for (const [id, attempts] of loginAttempts) {
        if (now - attempts.firstAttempt > LOGIN_ATTEMPT_WINDOW_MS) {
            loginAttempts.delete(id);
        }
    }
    for (const [id, session] of adminSessions) {
        if (session.expiresAt < now) {
            adminSessions.delete(id);
        }
    }
}, 5 * 60 * 1000);

function logAdminAction(socketId, action, details = {}) {
    const timestamp = new Date().toISOString();
    console.log(`[ADMIN ACTION] ${timestamp} | Socket: ${socketId} | Action: ${action} | Details:`, JSON.stringify(details));
}

function checkRateLimit(socketId) {
    const now = Date.now();
    const attempts = loginAttempts.get(socketId) || { count: 0, firstAttempt: now };

    if (now - attempts.firstAttempt > LOGIN_ATTEMPT_WINDOW_MS) {
        loginAttempts.set(socketId, { count: 1, firstAttempt: now });
        return true;
    }

    if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
        return false;
    }

    loginAttempts.set(socketId, { count: attempts.count + 1, firstAttempt: attempts.firstAttempt });
    return true;
}

function isSocketAdmin(socket) {
    const sess = adminSessions.get(socket.id);
    return Boolean(sess && typeof sess.expiresAt === 'number' && sess.expiresAt > Date.now());
}

function setSocketAdmin(socket) {
    adminSessions.set(socket.id, { expiresAt: Date.now() + ADMIN_SESSION_TIMEOUT_MS });
}

function clearSocketAdmin(socket) {
    adminSessions.delete(socket.id);
}

async function safeUnlinkIfExists(filePath) {
    try {
        await fs.promises.unlink(filePath);
        return true;
    } catch (e) {
        if (e && e.code === 'ENOENT') return false;
        console.error('[admin] file delete error:', e);
        return false;
    }
}

function tryResolveUploadPath(urlPath) {
    if (!urlPath || typeof urlPath !== 'string') return null;
    if (!urlPath.startsWith('/uploads/')) return null;

    const safeRel = urlPath.replace(/\?.*$/, '');
    const abs = path.join(__dirname, safeRel);
    const norm = path.normalize(abs);
    const uploadsRoot = path.normalize(path.join(__dirname, 'uploads'));
    if (!norm.startsWith(uploadsRoot)) return null;
    return norm;
}

io.on('connection', (socket) => {
    console.log(`[connect] ${socket.id}`);

    // Send full state to new client
    (async () => {
        // Users list (ephemeral, memory-only)
        const uniqueUsers = Object.values(users).filter((u, i, arr) => arr.findIndex(other => other.username === u.username) === i);
        socket.emit('users', uniqueUsers);
        console.log(`[emit] users (memory) count ->`, uniqueUsers.length);

        try {
            if (mongoose.connection.readyState === 1) {
                // Load recent messages from DB (limit to 200 for performance)
                const history = await Message.find({}).sort({ timestamp: 1 }).limit(200).lean();
                socket.emit('history', history);
                console.log(`[emit] history (db) count ->`, history.length);
            } else {
                socket.emit('history', messages);
                console.log(`[emit] history (memory) count ->`, messages.length);
            }
        } catch (err) {
            console.error('[history] error loading from DB, falling back to memory:', err);
            socket.emit('history', messages);
        }
    })();

    socket.on('join', async ({ username, avatar }) => {
        // Enforce unique usernames using memory (ephemeral presence)
        const nameTaken = Object.values(users).some(u => u.username === username);
        if (nameTaken) {
            socket.emit('join_error', { message: 'Username already taken. Please choose another.' });
            console.log(`[backend] join rejected for duplicate username (memory): ${username}`);
            return;
        }

        // Update DB record for reference (do not rely on DB for presence)
        try {
            if (mongoose.connection.readyState === 1) {
                await User.updateOne(
                    { username },
                    { $set: { avatar: avatar || null, status: 'online' }, $setOnInsert: { createdAt: new Date() } },
                    { upsert: true }
                );
            }
        } catch (e) {
            console.error('[join] DB update error (continuing with memory presence):', e);
        }

        // Reflect in memory map for this socket and broadcast
        users[socket.id] = { username, avatar, isOnline: true };
        const uniqueUsers = Object.values(users).filter((u, i, arr) => arr.findIndex(other => other.username === u.username) === i);
        io.emit('users', uniqueUsers);
        console.log(`[emit] users (memory) count ->`, uniqueUsers.length);
    });

    // Immediate leave handler for tab/window close
    socket.on('leave', async ({ username }) => {
        if (!username) return;
        console.log(`[leave] ${username} requested immediate leave`);
        // Remove all entries for this username (handles multiple tabs)
        for (const [id, user] of Object.entries(users)) {
            if (user.username === username) {
                delete users[id];
            }
        }
        try {
            if (mongoose.connection.readyState === 1) {
                await User.updateOne({ username }, { $set: { status: 'offline', lastSeen: new Date() } });
            }
        } catch (e) {
            console.error('[leave] DB update error:', e);
        }
        const uniqueUsers = Object.values(users).filter((u, i, arr) => arr.findIndex(other => other.username === u.username) === i);
        io.emit('users', uniqueUsers);
        console.log(`[emit] users (memory) count ->`, uniqueUsers.length);
    });

    socket.on('message', async (msg) => {
        console.log(`[recv] message from ${socket.id} (image: ${msg.image ? msg.image.length + 'B' : 'none'}, audio: ${msg.audio ? 'yes' : 'no'}, text: ${msg.content ? msg.content.length + 'chars' : 'empty'})`);


        // Persist to DB if available; keep memory as fallback
        try {
            if (mongoose.connection.readyState === 1) {
                await Message.create(msg);
            }
        } catch (err) {
            console.error('[db] error saving message:', err);
        }

        messages.push(msg);
        // Cap memory history to avoid unbounded growth (keep last 1000)
        if (messages.length > 1000) {
            messages = messages.slice(-1000);
        }
        io.emit('message', msg);
        console.log(`[emit] broadcasted message to ${io.engine.clientsCount} clients`);
    });

    socket.on('admin:login', async ({ password }) => {
        if (!checkRateLimit(socket.id)) {
            socket.emit('admin:loginResult', { success: false, error: 'Too many login attempts. Try again in 15 minutes.' });
            logAdminAction(socket.id, 'LOGIN_RATE_LIMITED');
            return;
        }

        const pwd = typeof password === 'string' ? password : '';
        const ok = Boolean(ADMIN_PASSWORD) && pwd === ADMIN_PASSWORD;

        if (ok) {
            setSocketAdmin(socket);
            loginAttempts.delete(socket.id);
            logAdminAction(socket.id, 'LOGIN_SUCCESS');
        } else {
            logAdminAction(socket.id, 'LOGIN_FAILED');
        }

        socket.emit('admin:loginResult', { success: ok });
    });

    socket.on('admin:logout', async () => {
        clearSocketAdmin(socket);
        logAdminAction(socket.id, 'LOGOUT');
        socket.emit('admin:logoutResult', { success: true });
    });

    socket.on('admin:deleteMessage', async ({ messageId }) => {
        if (!isSocketAdmin(socket)) {
            socket.emit('admin:error', { message: 'Not authorized' });
            return;
        }

        const id = typeof messageId === 'string' ? messageId : '';
        if (!id) {
            socket.emit('admin:error', { message: 'Invalid messageId' });
            return;
        }

        const msg = messages.find((m) => m && m.id === id);
        try {
            if (mongoose.connection.readyState === 1) {
                await Message.deleteOne({ id });
            }
        } catch (e) {
            console.error('[admin] DB delete error:', e);
        }

        messages = messages.filter((m) => !(m && m.id === id));

        try {
            const audioPath = tryResolveUploadPath(msg?.audio);
            if (audioPath) {
                await safeUnlinkIfExists(audioPath);
            }
            const coverPath = tryResolveUploadPath(msg?.audioMeta?.coverUrl);
            if (coverPath) {
                await safeUnlinkIfExists(coverPath);
            }
            const imagePath = tryResolveUploadPath(msg?.image);
            if (imagePath) {
                await safeUnlinkIfExists(imagePath);
            }
        } catch (e) {
            console.error('[admin] cleanup error:', e);
        }

        logAdminAction(socket.id, 'DELETE_MESSAGE', { messageId: id, username: msg?.username });
        io.emit('admin:messageDeleted', { messageId: id });
    });

    socket.on('admin:kickUser', async ({ username }) => {
        if (!isSocketAdmin(socket)) {
            socket.emit('admin:error', { message: 'Not authorized' });
            return;
        }

        const name = typeof username === 'string' ? username : '';
        if (!name) {
            socket.emit('admin:error', { message: 'Invalid username' });
            return;
        }

        const socketIdsToKick = Object.entries(users)
            .filter(([, u]) => u && u.username === name)
            .map(([id]) => id);

        for (const id of socketIdsToKick) {
            try {
                const s = io.sockets.sockets.get(id);
                if (s) {
                    clearSocketAdmin(s);
                    s.disconnect(true);
                }
            } catch (e) {
                console.error('[admin] kick error:', e);
            }
        }

        for (const id of socketIdsToKick) {
            delete users[id];
        }
        const uniqueUsers = Object.values(users).filter((u, i, arr) => arr.findIndex(other => other.username === u.username) === i);
        io.emit('users', uniqueUsers);
        logAdminAction(socket.id, 'KICK_USER', { username: name, socketsKicked: socketIdsToKick.length });
        io.emit('admin:userKicked', { username: name });
    });

    socket.on('disconnect', async () => {
        const userInfo = users[socket.id];
        if (userInfo) {
            console.log(`[disconnect] ${userInfo.username} (${socket.id})`);
            delete users[socket.id];
            clearSocketAdmin(socket);
            try {
                if (mongoose.connection.readyState === 1) {
                    await User.updateOne({ username: userInfo.username }, { $set: { status: 'offline', lastSeen: new Date() } });
                }
            } catch (e) {
                console.error('[disconnect] DB error (presence remains memory-only):', e);
            }
            // Always broadcast presence from memory
            const uniqueUsers = Object.values(users).filter((u, i, arr) => arr.findIndex(other => other.username === u.username) === i);
            io.emit('users', uniqueUsers);
            console.log(`[emit] users (memory) count ->`, uniqueUsers.length);
        }
    });

    // Handle avatar updates
    socket.on('update_avatar', async ({ username, avatar }) => {
        console.log(`[update_avatar] Updating avatar for ${username}`);

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
            // continue to DB update if possible
        }

        try {
            if (mongoose.connection.readyState === 1) {
                await User.updateOne({ username }, { $set: { avatar } });
            }
        } catch (e) {
            console.error('[update_avatar] DB error (presence remains memory-only):', e);
        }

        // Broadcast the updated users list (always memory)
        const uniqueUsers = Object.values(users).filter((u, i, arr) => arr.findIndex(other => other.username === u.username) === i);
        console.log(`[update_avatar] Broadcasting updated users count: ${uniqueUsers.length}`);
        io.emit('users', uniqueUsers);
    });

    socket.on('add_reaction', async ({ messageId, emoji, username }) => {
        console.log(`[add_reaction] ${username} adding ${emoji} to message ${messageId}`);

        try {
            // Update in database if available
            if (mongoose.connection.readyState === 1) {
                const msg = await Message.findOne({ id: messageId });
                if (msg) {
                    if (!msg.reactions) {
                        msg.reactions = new Map();
                    }
                    const users = msg.reactions.get(emoji) || [];
                    if (!users.includes(username)) {
                        users.push(username);
                        msg.reactions.set(emoji, users);
                        await msg.save();
                    }
                }
            }

            // Update in memory
            const msg = messages.find(m => m.id === messageId);
            if (msg) {
                if (!msg.reactions) {
                    msg.reactions = {};
                }
                if (!msg.reactions[emoji]) {
                    msg.reactions[emoji] = [];
                }
                if (!msg.reactions[emoji].includes(username)) {
                    msg.reactions[emoji].push(username);
                }
            }

            // Broadcast reaction update
            io.emit('reaction_updated', { messageId, emoji, username, action: 'add' });
        } catch (err) {
            console.error('[add_reaction] error:', err);
        }
    });

    socket.on('remove_reaction', async ({ messageId, emoji, username }) => {
        console.log(`[remove_reaction] ${username} removing ${emoji} from message ${messageId}`);

        try {
            // Update in database if available
            if (mongoose.connection.readyState === 1) {
                const msg = await Message.findOne({ id: messageId });
                if (msg && msg.reactions) {
                    const users = msg.reactions.get(emoji) || [];
                    const filtered = users.filter(u => u !== username);
                    if (filtered.length === 0) {
                        msg.reactions.delete(emoji);
                    } else {
                        msg.reactions.set(emoji, filtered);
                    }
                    await msg.save();
                }
            }

            // Update in memory
            const msg = messages.find(m => m.id === messageId);
            if (msg && msg.reactions && msg.reactions[emoji]) {
                msg.reactions[emoji] = msg.reactions[emoji].filter(u => u !== username);
                if (msg.reactions[emoji].length === 0) {
                    delete msg.reactions[emoji];
                }
            }

            // Broadcast reaction update
            io.emit('reaction_updated', { messageId, emoji, username, action: 'remove' });
        } catch (err) {
            console.error('[remove_reaction] error:', err);
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

// Use the PORT variable defined at the top of the file
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`WebSocket server is running`);
    console.log(`API endpoint available at: http://localhost:${PORT}/api/link-preview`);
});