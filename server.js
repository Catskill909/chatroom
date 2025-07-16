import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);
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
        console.log(`[backend] join event received from ${socket.id}:`, { username, avatar });
        users[socket.id] = { username, avatar, isOnline: true };
        io.emit('users', Object.values(users));
        console.log(`[emit] users ->`, Object.values(users));
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
            io.emit('users', Object.values(users));
            console.log(`[emit] users ->`, Object.values(users));
        }
    });

    socket.on('error', (err) => {
        console.error(`[socket error]`, err);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`WebSocket server running on port ${PORT}`);
});