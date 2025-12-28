// Network Manager - Handles all WebSocket communication
import { io } from 'socket.io-client';

export class NetworkManager extends EventTarget {
    constructor() {
        super();
        this.socket = null;
        this.matchId = null;
        this.playerId = null;
        this.sessionToken = null;
        this.connected = false;
    }

    connect() {
        // Connect to server (development: localhost, production: Vercel)
        const serverUrl = import.meta.env.PROD ? '' : 'http://localhost:3001';

        this.socket = io(serverUrl, {
            transports: ['websocket'],
            upgrade: false
        });

        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.connected = true;
            this.dispatchEvent(new Event('connect'));
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.connected = false;
            this.dispatchEvent(new Event('disconnect'));
        });

        this.socket.on('matchCreated', (data) => {
            this.matchId = data.matchId;
            this.playerId = data.playerId;
            this.sessionToken = data.sessionToken;
            this.dispatchEvent(new CustomEvent('matchCreated', { detail: data }));
        });

        this.socket.on('matchJoined', (data) => {
            this.matchId = data.matchId;
            this.playerId = data.playerId;
            this.sessionToken = data.sessionToken;
            this.dispatchEvent(new CustomEvent('matchJoined', { detail: data }));
        });

        this.socket.on('opponentJoined', (data) => {
            this.dispatchEvent(new CustomEvent('opponentJoined', { detail: data }));
        });

        this.socket.on('gameStart', (data) => {
            this.dispatchEvent(new CustomEvent('gameStart', { detail: data }));
        });

        this.socket.on('stateUpdate', (data) => {
            this.dispatchEvent(new CustomEvent('stateUpdate', { detail: data }));
        });

        this.socket.on('hitConfirmed', (data) => {
            this.dispatchEvent(new CustomEvent('hitConfirmed', { detail: data }));
        });

        this.socket.on('playerDied', (data) => {
            this.dispatchEvent(new CustomEvent('playerDied', { detail: data }));
        });

        this.socket.on('playerFired', (data) => {
            this.dispatchEvent(new CustomEvent('playerFired', { detail: data }));
        });

        this.socket.on('roundStart', (data) => {
            this.dispatchEvent(new CustomEvent('roundStart', { detail: data }));
        });

        this.socket.on('roundEnd', (data) => {
            this.dispatchEvent(new CustomEvent('roundEnd', { detail: data }));
        });

        this.socket.on('matchEnd', (data) => {
            this.dispatchEvent(new CustomEvent('matchEnd', { detail: data }));
        });

        this.socket.on('matchReset', (data) => {
            this.dispatchEvent(new CustomEvent('matchReset', { detail: data }));
        });

        this.socket.on('playerRespawn', (data) => {
            this.dispatchEvent(new CustomEvent('playerRespawn', { detail: data }));
        });

        this.socket.on('settingsUpdated', (data) => {
            this.dispatchEvent(new CustomEvent('settingsUpdated', { detail: data }));
        });

        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
        });
    }

    async createMatch(settings = {}) {
        if (!this.socket) this.connect();

        if (!this.connected) {
            await new Promise(resolve => {
                this.addEventListener('connect', () => resolve(), { once: true });
                setTimeout(() => resolve(), 5000);
            });
        }

        return new Promise((resolve, reject) => {
            this.socket.emit('createMatch', settings, (response) => {
                if (response.success) {
                    this.matchId = response.matchId;
                    this.playerId = response.playerId;
                    this.sessionToken = response.sessionToken;

                    this.dispatchEvent(new CustomEvent('matchCreated', { detail: response }));
                    resolve(response);
                } else {
                    reject(response.error);
                }
            });
        });
    }

    async createBotMatch(settings = {}) {
        if (!this.socket) this.connect();

        if (!this.connected) {
            await new Promise(resolve => {
                this.addEventListener('connect', () => resolve(), { once: true });
                setTimeout(() => resolve(), 5000);
            });
        }

        return new Promise((resolve, reject) => {
            const botSettings = {
                ...settings,
                matchMode: 'COOP_BOT',
                botCount: 4,
                botDifficulty: 'MEDIO',
                roundTime: 180,
                rounds: 10
            };
            this.socket.emit('createMatch', botSettings, (response) => {
                if (response.success) {
                    this.matchId = response.matchId;
                    this.playerId = response.playerId;
                    this.sessionToken = response.sessionToken;

                    this.dispatchEvent(new CustomEvent('matchCreated', { detail: response }));
                    resolve(response);
                } else {
                    reject(response.error);
                }
            });
        });
    }

    async joinMatch(data) {
        if (!this.socket) this.connect();

        const { code, nickname } = data;
        return new Promise((resolve, reject) => {
            this.socket.emit('joinMatch', { inviteCode: code, nickname }, (response) => {
                if (response.success) {
                    this.matchId = response.matchId;
                    this.playerId = response.playerId;
                    this.sessionToken = response.sessionToken;

                    // Dispatch event so main.js can handle it
                    this.dispatchEvent(new CustomEvent('matchJoined', { detail: response }));

                    resolve(response);
                } else {
                    reject(response.error);
                }
            });
        });
    }

    sendMovement(data) {
        if (this.socket && this.connected) {
            this.socket.emit('playerMovement', {
                ...data,
                timestamp: Date.now()
            });
        }
    }

    sendShoot(data) {
        if (this.socket && this.connected) {
            this.socket.emit('playerShoot', {
                ...data,
                timestamp: Date.now()
            });
        }
    }

    sendReload() {
        if (this.socket && this.connected) {
            this.socket.emit('playerReload', {
                timestamp: Date.now()
            });
        }
    }

    sendScopeToggle(scoped) {
        if (this.socket && this.connected) {
            this.socket.emit('scopeToggle', {
                scoped,
                timestamp: Date.now()
            });
        }
    }

    sendUpdateSettings(settings) {
        if (this.socket && this.connected) {
            this.socket.emit('updateSettings', settings);
        }
    }

    sendStartGame() {
        if (this.socket && this.connected) {
            this.socket.emit('startGame');
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.matchId = null;
            this.playerId = null;
            this.sessionToken = null;
            this.connected = false;
        }
    }
}
