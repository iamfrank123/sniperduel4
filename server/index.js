// Server Entry Point
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { MatchManager } from './game/MatchManager.js';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from dist folder (production)
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 3001;
const matchManager = new MatchManager(io);

app.get('/status', (req, res) => {
    res.json({ status: 'ok', activeMatches: matchManager.matches.size });
});

app.get('*', (req, res) => {
    if (!req.path.startsWith('/socket.io')) {
        res.sendFile(path.join(distPath, 'index.html'));
    }
});

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('createMatch', (data, callback) => {
        try {
            const result = matchManager.createMatch(socket, data);
            callback(result);
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    socket.on('joinMatch', (data, callback) => {
        try {
            const result = matchManager.joinMatch(socket, data);
            callback(result);
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    socket.on('playerMovement', (data) => matchManager.handlePlayerMovement(socket, data));
    socket.on('playerShoot', (data) => matchManager.handlePlayerShoot(socket, data));
    socket.on('playerReload', (data) => matchManager.handlePlayerReload(socket, data));
    socket.on('updateSettings', (data) => matchManager.handleUpdateSettings(socket, data));
    socket.on('startGame', () => matchManager.handleStartGame(socket));
    socket.on('scopeToggle', (data) => {
        matchManager.handleScopeToggle(socket, data);
    });

    socket.on('requestRematch', () => {
        matchManager.handleRematchRequest(socket);
    });

    socket.on('disconnect', () => { matchManager.handleDisconnect(socket); });
});

httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🎮 Sniper Duel Server on port ${PORT}`);
});
