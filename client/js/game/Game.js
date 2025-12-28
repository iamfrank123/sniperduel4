// Main Game Class - Coordinates all game systems
import * as THREE from 'three';
import { Scene } from './Scene.js';
import { Player } from './Player.js';
import { InputManager } from '../utils/InputManager.js';
import { GAME_CONSTANTS } from '../../../shared/constants.js';
import { SniperModel } from './SniperModel.js';

export class Game {
    constructor(network, ui, audioManager) {
        this.network = network;
        this.ui = ui;
        this.audioManager = audioManager;
        this.input = new InputManager();

        this.scene = null;
        this.player = null;
        this.opponents = new Map(); // playerId -> SniperModel

        this.running = false;
        this.lastTime = 0;
        this.opponentsData = new Map(); // Store history for interpolation

        this.gameState = {
            round: 1,
            scores: {}, // playerId -> score
            players: {}, // playerId -> {nickname}
            timeRemaining: GAME_CONSTANTS.ROUND_TIME
        };

        this.init();
    }

    init() {
        // Initialize Three.js scene
        this.scene = new Scene();

        // Initialize player
        this.player = new Player(this.scene.scene, this.scene.camera, this.input, this.network, this.ui, this.audioManager);

        // Network event listeners
        this.network.addEventListener('stateUpdate', (e) => this.onStateUpdate(e.detail));
        this.network.addEventListener('hitConfirmed', (e) => this.onHitConfirmed(e.detail));
        this.network.addEventListener('playerDied', (e) => this.onPlayerDied(e.detail));
        this.network.addEventListener('roundStart', (e) => this.onRoundStart(e.detail));
        this.network.addEventListener('roundEnd', (e) => this.onRoundEnd(e.detail));
        this.network.addEventListener('matchEnd', (e) => this.onMatchEnd(e.detail));
        this.network.addEventListener('matchReset', (e) => this.onMatchReset(e.detail));
        this.network.addEventListener('playerFired', (e) => this.onPlayerFired(e.detail));
        this.network.addEventListener('playerRespawn', (e) => this.onPlayerRespawn(e.detail));

        // Request pointer lock on click
        this.onClick = () => {
            if (this.running) {
                this.input.requestPointerLock(this.scene.renderer.domElement);
            }
        };
        document.addEventListener('click', this.onClick);
    }

    start() {
        this.running = true;
        this.lastTime = performance.now();
        this.gameLoop();
    }

    gameLoop() {
        if (!this.running) return;

        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.scene.render();

        requestAnimationFrame(() => this.gameLoop());
    }

    update(deltaTime) {
        if (this.player) {
            this.player.update(deltaTime);
        }

        this.interpolateOpponents();
    }

    onStateUpdate(data) {
        if (data.round) {
            this.gameState.round = data.round;
            this.ui.updateRound(data.round, data.roundsToWin || GAME_CONSTANTS.ROUNDS_TO_WIN);
        }

        if (data.scores) {
            this.gameState.scores = data.scores;
        }

        if (data.timeRemaining !== undefined) {
            this.gameState.timeRemaining = data.timeRemaining;
            this.ui.updateTimer(Math.ceil(data.timeRemaining));
        }

        if (data.players) {
            this.gameState.players = data.players;
            this.ui.updateScore(this.gameState.scores, this.gameState.players, this.network.playerId);

            // Update opponents
            const currentOpponentIds = new Set(Object.keys(data.players).filter(id => id !== this.network.playerId));

            // Remove players who left
            for (const [id, model] of this.opponents) {
                if (!currentOpponentIds.has(id)) {
                    this.scene.scene.remove(model);
                    this.opponents.delete(id);
                    this.opponentsData.delete(id);
                }
            }

            // Update/Add opponents
            for (const id of currentOpponentIds) {
                this.updateOpponent(id, data.players[id]);
            }
        }
    }

    updateOpponent(id, opponentData) {
        let opponentModel = this.opponents.get(id);
        if (!opponentModel) {
            opponentModel = this.createOpponentMesh();
            this.opponents.set(id, opponentModel);
        }

        // Initialize or update interpolation buffer
        if (!this.opponentsData.has(id)) {
            this.opponentsData.set(id, {
                buffer: [],
                visible: true
            });
        }

        const data = this.opponentsData.get(id);

        // Add new snapshot to buffer
        data.buffer.push({
            timestamp: Date.now(),
            position: { ...opponentData.position },
            rotation: { ...opponentData.rotation },
            isDead: opponentData.isDead
        });

        // Keep buffer small
        if (data.buffer.length > 10) data.buffer.shift();

        if (opponentData.nickname && opponentModel.setName && !opponentModel.hasName) {
            opponentModel.setName(opponentData.nickname);
            opponentModel.hasName = true;
        }

        opponentModel.visible = !opponentData.isDead;
    }

    interpolateOpponents() {
        const renderTime = Date.now() - GAME_CONSTANTS.INTERPOLATION_DELAY;

        for (const [id, model] of this.opponents) {
            const data = this.opponentsData.get(id);
            if (!data || data.buffer.length < 2) continue;

            const buffer = data.buffer;

            // Find two snapshots to interpolate between
            let i = 0;
            while (i < buffer.length - 2 && buffer[i + 1].timestamp < renderTime) {
                i++;
            }

            const s0 = buffer[i];
            const s1 = buffer[i + 1];

            if (renderTime >= s0.timestamp && renderTime <= s1.timestamp) {
                const fraction = (renderTime - s0.timestamp) / (s1.timestamp - s0.timestamp);

                // Interpolate position
                model.position.lerpVectors(
                    new THREE.Vector3(s0.position.x, s0.position.y, s0.position.z),
                    new THREE.Vector3(s1.position.x, s1.position.y, s1.position.z),
                    fraction
                );

                // Interpolate rotation (yaw)
                // Use shortest path for rotation
                let startYaw = s0.rotation.yaw || 0;
                let endYaw = s1.rotation.yaw || 0;
                let diff = endYaw - startYaw;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;

                model.rotation.y = startYaw + diff * fraction;
            } else if (renderTime > s1.timestamp) {
                // Extrapolate or just set to latest (simplified)
                model.position.set(s1.position.x, s1.position.y, s1.position.z);
                model.rotation.y = s1.rotation.yaw || 0;
            }
        }
    }

    createOpponentMesh() {
        const mesh = new SniperModel();
        this.scene.scene.add(mesh);
        return mesh;
    }

    onHitConfirmed(data) {
        // Play hit sound for both shooter and victim
        if (data.shooterId === this.network.playerId || data.victimId === this.network.playerId) {
            this.audioManager.playHit();
        }

        if (data.fatal) {
            if (data.hitbox === 'HEAD') {
                // Only play headshot announcement if it's a human player
                if (!data.isShooterBot) {
                    this.audioManager.playHeadshotKill();
                } else {
                    this.audioManager.playKilled();
                }
            } else {
                this.audioManager.playKilled();
            }
        }

        if (data.shooterId === this.network.playerId) {
            const shooter = 'You';
            const victim = data.victimNickname || 'Enemy';
            this.ui.showHitMarker(data.hitbox === 'HEAD');

            if (data.fatal) {
                this.ui.addKillFeedEntry(shooter, victim, data.hitbox === 'HEAD');
            }
        } else if (data.victimId === this.network.playerId) {
            const shooter = data.shooterNickname || 'Enemy';
            const victim = 'You';

            if (data.fatal) {
                this.ui.addKillFeedEntry(shooter, victim, data.hitbox === 'HEAD');
            }

            this.ui.showDamageIndicator();
            this.player.takeDamage(data.damage);
        }
    }

    onPlayerDied(data) {
        if (data.victimId === this.network.playerId) {
            this.player.die();
        }
    }

    onRoundStart(data) {
        console.log('Game: Round Start', data);
        if (this.player && data.spawns && data.spawns[this.network.playerId]) {
            const spawnInfo = data.spawns[this.network.playerId];
            this.player.respawn(spawnInfo.spawnPosition, spawnInfo.spawnRotation);
        }
        this.gameState.round = data.round;
        this.ui.updateRound(data.round, data.roundsToWin || GAME_CONSTANTS.ROUNDS_TO_WIN);

        if (data.players) {
            this.gameState.players = data.players;
        }
        this.ui.updateScore(this.gameState.scores, this.gameState.players, this.network.playerId);
    }

    onRoundEnd(data) {
        const won = data.winnerId === this.network.playerId;
        this.ui.showRoundEnd(won, data.reason);
        this.gameState.scores = data.scores;
        this.ui.updateScore(this.gameState.scores, this.gameState.players, this.network.playerId);
    }

    onMatchEnd(data) {
        const won = data.winnerId === this.network.playerId;
        this.ui.showMatchEnd(won, data.scores, this.gameState.players);
        // Don't stop running loop immediately, wait for user action
        // this.running = false; 
    }

    onMatchReset(data) {
        console.log('Game: Match Reset', data);
        this.gameState.round = data.round;
        this.gameState.scores = data.scores;
        this.gameState.timeRemaining = GAME_CONSTANTS.ROUND_TIME;

        this.ui.hideAllScreens();
        this.ui.showHUD();
        this.ui.updateRound(data.round, data.roundsToWin || GAME_CONSTANTS.ROUNDS_TO_WIN);
        this.ui.updateScore(this.gameState.scores, this.gameState.players, this.network.playerId);

        // Reset player 
        // Use default spawn for now until server sends specific spawn
        this.player.respawn(null);
        this.running = true;
        this.gameLoop();
    }

    onPlayerFired(data) {
        if (data.shooterId !== this.network.playerId) {
            this.audioManager.playShot();
        }
    }

    onPlayerRespawn(data) {
        if (data.playerId === this.network.playerId) {
            this.player.respawn(data.position, data.rotation);
        }
    }

    destroy() {
        this.running = false;
        document.removeEventListener('click', this.onClick);
        if (this.scene) this.scene.dispose();
        if (this.input) this.input.exitPointerLock();
    }
}
