// Main Game Class - Coordinates all game systems
import * as THREE from 'three';
import { Scene } from './Scene.js';
import { Player } from './Player.js';
import { InputManager } from '../utils/InputManager.js';
import { GAME_CONSTANTS } from '../../../shared/constants.js';
import { SniperModel } from './SniperModel.js';
import { PauseMenu } from '../ui/PauseMenu.js';

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

        // Initialize pause menu
        this.pauseMenu = new PauseMenu(this);

        // Connect ESC key to pause menu
        this.input.onEscapePressed(() => {
            if (this.running) {
                this.pauseMenu.toggle();
            }
        });

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

        // Enable fullscreen enforcement when game starts
        if (this.pauseMenu) {
            this.pauseMenu.enableFullscreenEnforcement();
        }

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
                visible: true,
                lastState: { // Store last known full state
                    position: { x: 0, y: 0, z: 0 },
                    rotation: { yaw: 0, pitch: 0 }
                }
            });
        }

        const data = this.opponentsData.get(id);

        // Update last known state with any new data present in opponentData
        if (opponentData.position) data.lastState.position = { ...opponentData.position };
        if (opponentData.rotation) data.lastState.rotation = { ...opponentData.rotation };
        // Use last known state if data is missing in this delta update
        const currentPos = opponentData.position || data.lastState.position;
        const currentRot = opponentData.rotation || data.lastState.rotation;

        // RESPAWN FIX: Hide dead players immediately and clear buffer
        // Note: Check explicitly if isDead is present, otherwise assume false (alive)
        const isDead = opponentData.isDead === true;

        if (isDead) {
            opponentModel.visible = false;
            data.buffer = []; // Clear interpolation buffer to prevent teleport animation
            return;
        } else {
            opponentModel.visible = true;
        }

        // Add new snapshot to buffer (only for alive players)
        data.buffer.push({
            timestamp: Date.now(),
            position: { ...currentPos },
            rotation: { ...currentRot },
            isDead: isDead
        });

        // Keep buffer small
        if (data.buffer.length > 10) data.buffer.shift();

        if (opponentData.nickname && opponentModel.setName && !opponentModel.hasName) {
            opponentModel.setName(opponentData.nickname);
            opponentModel.hasName = true;
        }
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
                // GLITCH FIX: Check if position change is too large (teleport detection)
                const dx = s1.position.x - s0.position.x;
                const dy = s1.position.y - s0.position.y;
                const dz = s1.position.z - s0.position.z;
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

                // If movement is more than 10 units, it's likely a teleport - snap directly
                const TELEPORT_THRESHOLD = 10;
                if (distance > TELEPORT_THRESHOLD) {
                    // Snap to new position instead of interpolating
                    model.position.set(s1.position.x, s1.position.y, s1.position.z);
                    model.rotation.y = s1.rotation.yaw || 0;
                    continue;
                }

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
