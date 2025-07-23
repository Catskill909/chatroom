import express from 'express';
import http from 'http';
import https from 'https';
import fs from 'fs';
import { Server } from 'socket.io';
import multer from 'multer';
import path from 'path';
import cors from 'cors';
import { getLinkPreview } from 'link-preview-js';

const app = express();

// Get port from environment variable or use 3000 as default
const PORT = process.env.PORT || 3000;

// Enable CORS for all HTTP requests
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Handle preflight requests
app.options('*', cors());

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
// Configure multer with file size limits (15MB to be safe)
const multerOptions = {
    storage: audioStorage,
    limits: {
        fileSize: 15 * 1024 * 1024, // 15MB limit per file
        files: 1
    }
};

const audioUpload = multer(multerOptions);
const coverUpload = multer({
    storage: coverStorage,
    limits: {
        fileSize: 15 * 1024 * 1024, // 15MB limit per file
        files: 1
    }
});

// Increase the request size limit
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

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
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true
    },
    maxHttpBufferSize: 20 * 1024 * 1024, // 20MB max payload size
    pingTimeout: 60000, // Increase ping timeout to 60 seconds
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

// Use the PORT variable defined at the top of the file
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`WebSocket server is running`);
    console.log(`API endpoint available at: http://localhost:${PORT}/api/link-preview`);
});