// Match Manager - Handles match creation, joining, and game state
import { GameState } from './GameState.js';
import { generateInviteCode } from '../utils/InviteCodeGenerator.js';

export class MatchManager {
    constructor(io) {
        this.io = io;
        this.matches = new Map(); // matchId -> GameState
        this.socketToMatch = new Map(); // socket.id -> matchId
        this.socketToPlayer = new Map(); // socket.id -> playerId
    }

    createMatch(socket, settings = {}) {
        const matchId = this.generateMatchId();
        const inviteCode = generateInviteCode();
        const playerId = this.generatePlayerId();
        const nickname = settings.nickname || 'Player 1';

        // Create game state with settings
        const gameState = new GameState(matchId, inviteCode, this.io, settings);
        gameState.addPlayer(playerId, socket, nickname);

        // Store mappings
        this.matches.set(matchId, gameState);
        this.socketToMatch.set(socket.id, matchId);
        this.socketToPlayer.set(socket.id, playerId);

        // Join socket room
        socket.join(matchId);

        console.log(`Match created: ${inviteCode} (${matchId}) by ${nickname}`);

        return {
            success: true,
            matchId,
            inviteCode,
            playerId,
            sessionToken: this.generateSessionToken(playerId, matchId),
            settings: {
                rounds: gameState.roundsToWin,
                autoRematch: gameState.autoRematch,
                infiniteAmmo: gameState.infiniteAmmo,
                movementSpeed: gameState.movementSpeed,
                jumpLevel: gameState.jumpLevel,
                matchMode: gameState.matchMode,
                botDifficulty: gameState.botDifficulty,
                botCount: gameState.botCount
            }
        };
    }

    joinMatch(socket, data) {
        const { inviteCode, nickname = 'Player 2' } = data;
        // Find match by invite code
        let targetMatch = null;
        let targetMatchId = null;

        for (const [matchId, gameState] of this.matches) {
            if (gameState.inviteCode === inviteCode.toUpperCase()) {
                targetMatch = gameState;
                targetMatchId = matchId;
                break;
            }
        }

        if (!targetMatch) {
            throw new Error('Match not found');
        }

        if (targetMatch.players.size >= 6) {
            throw new Error('Match is full');
        }

        const playerId = this.generatePlayerId();
        targetMatch.addPlayer(playerId, socket, nickname);

        // Store mappings
        this.socketToMatch.set(socket.id, targetMatchId);
        this.socketToPlayer.set(socket.id, playerId);

        // Join socket room
        socket.join(targetMatchId);

        console.log(`Player joined match: ${inviteCode}`);

        // Notify others that a new player joined
        this.io.to(targetMatchId).emit('opponentJoined', {
            playerId,
            nickname
        });

        // Start game if it's the 2nd player and match is waiting, OR if it's VS BOT mode
        const minPlayers = targetMatch.matchMode === 'PVP' ? 2 : 1;
        if (targetMatch.status === 'WAITING' && targetMatch.players.size >= minPlayers) {
            setTimeout(() => {
                targetMatch.startGame();
            }, 2000);
        } else if (targetMatch.status === 'IN_PROGRESS') {
            // If already in progress, the new player will get the next tick
            // But we might want to manually emit gameStart to them so they init the UI
            socket.emit('gameStart', {
                round: targetMatch.round,
                scores: targetMatch.scores,
                roundsToWin: targetMatch.roundsToWin
            });
        }

        return {
            success: true,
            matchId: targetMatchId,
            inviteCode,
            playerId,
            sessionToken: this.generateSessionToken(playerId, targetMatchId),
            settings: {
                rounds: targetMatch.roundsToWin,
                autoRematch: targetMatch.autoRematch,
                infiniteAmmo: targetMatch.infiniteAmmo,
                movementSpeed: targetMatch.movementSpeed,
                jumpLevel: targetMatch.jumpLevel,
                matchMode: targetMatch.matchMode,
                botDifficulty: targetMatch.botDifficulty,
                botCount: targetMatch.botCount
            }
        };
    }

    handlePlayerMovement(socket, data) {
        const matchId = this.socketToMatch.get(socket.id);
        const playerId = this.socketToPlayer.get(socket.id);

        if (!matchId || !playerId) return;

        const gameState = this.matches.get(matchId);
        if (gameState) {
            gameState.updatePlayerMovement(playerId, data);
        }
    }

    handlePlayerShoot(socket, data) {
        const matchId = this.socketToMatch.get(socket.id);
        const playerId = this.socketToPlayer.get(socket.id);

        if (!matchId || !playerId) return;

        const gameState = this.matches.get(matchId);
        if (gameState) {
            gameState.handlePlayerShoot(playerId, data);
        }
    }

    handlePlayerReload(socket, data) {
        const matchId = this.socketToMatch.get(socket.id);
        const playerId = this.socketToPlayer.get(socket.id);

        if (!matchId || !playerId) return;

        const gameState = this.matches.get(matchId);
        if (gameState) {
            gameState.handlePlayerReload(playerId);
        }
    }

    handleScopeToggle(socket, data) {
        const matchId = this.socketToMatch.get(socket.id);
        const playerId = this.socketToPlayer.get(socket.id);

        if (!matchId || !playerId) return;

        const gameState = this.matches.get(matchId);
        if (gameState) {
            gameState.handleScopeToggle(playerId, data.scoped);
        }
    }

    handleUpdateSettings(socket, settings) {
        const matchId = this.socketToMatch.get(socket.id);
        if (!matchId) return;

        const gameState = this.matches.get(matchId);
        if (gameState) {
            gameState.updateSettings(settings);
        }
    }

    handleStartGame(socket) {
        const matchId = this.socketToMatch.get(socket.id);
        if (!matchId) return;

        const gameState = this.matches.get(matchId);
        if (gameState && gameState.status === 'WAITING') {
            gameState.startGame();
        }
    }

    handleRematchRequest(socket) {
        const matchId = this.socketToMatch.get(socket.id);
        const playerId = this.socketToPlayer.get(socket.id);

        if (!matchId || !playerId) return;

        const gameState = this.matches.get(matchId);
        if (gameState) {
            gameState.handleRematchRequest(playerId);
        }
    }

    handleDisconnect(socket) {
        const matchId = this.socketToMatch.get(socket.id);
        const playerId = this.socketToPlayer.get(socket.id);

        if (matchId && playerId) {
            const gameState = this.matches.get(matchId);
            if (gameState) {
                gameState.handlePlayerDisconnect(playerId);

                // Clean up empty matches
                if (gameState.isEmpty()) {
                    this.matches.delete(matchId);
                    console.log(`Match deleted: ${matchId}`);
                }
            }
        }

        this.socketToMatch.delete(socket.id);
        this.socketToPlayer.delete(socket.id);
    }

    generateMatchId() {
        return 'match_' + Math.random().toString(36).substr(2, 9);
    }

    generatePlayerId() {
        return 'player_' + Math.random().toString(36).substr(2, 9);
    }

    generateSessionToken(playerId, matchId) {
        // Simple token for now (in production, use JWT)
        return Buffer.from(`${playerId}:${matchId}`).toString('base64');
    }
}
