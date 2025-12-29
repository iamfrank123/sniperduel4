import { GAME_CONSTANTS, BOT_DIFFICULTY, MATCH_MODES } from '../../shared/constants.js';
import { checkMapCollision } from '../../shared/MapData.js';

export class BotAI {
    constructor(playerState, gameState) {
        this.bot = playerState;
        this.gameState = gameState;
        this.difficulty = gameState.botDifficulty || BOT_DIFFICULTY.MEDIO;

        this.target = null;
        this.state = 'PATROL';
        this.lastStateChange = Date.now();

        this.patrolTarget = this.getRandomPatrolPoint();
        this.lastShotTime = 0;
        this.reactionTime = this.getReactionTime();
        this.accuracy = this.getAccuracy();

        this.moveDir = { x: 0, z: 0 };
        this.lookAtPos = null;

        this.velocityY = 0;
        this.isGrounded = true;

        this.lastMoveChangeTime = 0;
        this.moveChangeInterval = 1000 + Math.random() * 2000;
        this.collisionCooldown = 0;

        this.nextJumpTime = Date.now() + 5000 + Math.random() * 5000;
        
        // Cache per line of sight
        this.lastLOSCheck = 0;
        this.lastLOSResult = false;
        this.losCheckInterval = 500; // Check ogni 500ms
    }

    getReactionTime() {
        switch (this.difficulty) {
            case BOT_DIFFICULTY.FACILE: return 1500;
            case BOT_DIFFICULTY.MEDIO: return 800;
            case BOT_DIFFICULTY.DIFFICILE: return 400;
            case BOT_DIFFICULTY.VETERANO: return 150;
            default: return 800;
        }
    }

    getAccuracy() {
        switch (this.difficulty) {
            case BOT_DIFFICULTY.FACILE: return 0.3;
            case BOT_DIFFICULTY.MEDIO: return 0.5;
            case BOT_DIFFICULTY.DIFFICILE: return 0.8;
            case BOT_DIFFICULTY.VETERANO: return 0.95;
            default: return 0.5;
        }
    }

    getRandomPatrolPoint() {
        const points = this.gameState.getSpawnPoints();
        return points[Math.floor(Math.random() * points.length)];
    }

    update(deltaTime) {
        if (this.bot.isDead) return;

        this.findTarget();

        switch (this.state) {
            case 'PATROL':
                this.updatePatrol(deltaTime);
                break;
            case 'CHASE':
                this.updateChase(deltaTime);
                break;
            case 'COVER':
                this.updateCover(deltaTime);
                break;
        }

        this.applyGravity(deltaTime);
        this.handleJumping();
        this.applyMovement(deltaTime);
        this.handleShooting();
    }

    applyGravity(deltaTime) {
        if (!this.isGrounded) {
            this.velocityY -= GAME_CONSTANTS.GRAVITY * deltaTime;
        } else {
            this.velocityY = 0;
        }

        const nextY = this.bot.position.y + this.velocityY * deltaTime;

        if (nextY <= 0) {
            this.bot.position.y = 0;
            this.isGrounded = true;
            this.velocityY = 0;
        } else {
            this.bot.position.y = nextY;
            this.isGrounded = false;
        }
    }

    handleJumping() {
        const now = Date.now();
        if (now > this.nextJumpTime && this.isGrounded) {
            this.velocityY = GAME_CONSTANTS.JUMP_VELOCITY;
            this.isGrounded = false;
            this.nextJumpTime = now + 5000 + Math.random() * 5000;
        }
    }

    findTarget() {
        let closestTarget = null;
        let minDistance = Infinity;

        for (const [id, player] of this.gameState.players) {
            if (id === this.bot.id || player.isDead) continue;

            // In COOP_BOT mode, bots only target players
            if (this.gameState.matchMode === MATCH_MODES.COOP_BOT) {
                if (player.isBot) continue;
            }

            const dist = this.getDistance(this.bot.position, player.position);

            // FIX: Line of Sight check con cache
            const hasLOS = this.hasLineOfSight(this.bot.position, player.position);

            if (dist < minDistance && hasLOS) {
                minDistance = dist;
                closestTarget = player;
            }
        }

        if (closestTarget) {
            this.target = closestTarget;
            if (this.state === 'PATROL') {
                this.changeState('CHASE');
            }
        } else {
            this.target = null;
            if (this.state === 'CHASE') {
                this.changeState('PATROL');
            }
        }
    }

    // FIX: Implementazione Line of Sight
    hasLineOfSight(from, to) {
        const now = Date.now();
        
        // Cache risultato per performance
        if (now - this.lastLOSCheck < this.losCheckInterval) {
            return this.lastLOSResult;
        }

        this.lastLOSCheck = now;

        const dir = this.getDir(from, to);
        const dist = this.getDistance(from, to);
        const steps = Math.ceil(dist);

        // Raycast step by step
        for (let i = 1; i < steps; i++) {
            const checkPoint = {
                x: from.x + dir.x * i,
                y: from.y + 1.0, // Altezza degli occhi
                z: from.z + dir.z * i
            };

            if (checkMapCollision(checkPoint, 0.1)) {
                this.lastLOSResult = false;
                return false; // Muro blocca la vista
            }
        }

        this.lastLOSResult = true;
        return true;
    }

    updatePatrol(deltaTime) {
        if (!this.patrolTarget) {
            this.patrolTarget = this.getRandomPatrolPoint();
        }

        const dist = this.getDistance(this.bot.position, this.patrolTarget);
        if (dist < 1.0) {
            this.patrolTarget = this.getRandomPatrolPoint();
        }

        this.moveDir = this.getDir(this.bot.position, this.patrolTarget);
        this.lookAtPos = this.patrolTarget;
    }

    updateChase(deltaTime) {
        if (!this.target) return;

        const dist = this.getDistance(this.bot.position, this.target.position);

        const now = Date.now();
        
        if (dist > 15) {
            this.moveDir = this.getDir(this.bot.position, this.target.position);
        } else {
            // Strafe con timing variabile
            if (now - this.lastMoveChangeTime > this.moveChangeInterval) {
                this.moveDir = {
                    x: (Math.random() - 0.5) * 2,
                    z: (Math.random() - 0.5) * 2
                };
                this.lastMoveChangeTime = now;
                this.moveChangeInterval = 1500 + Math.random() * 2000;
            }
        }

        this.lookAtPos = {
            x: this.target.position.x,
            y: this.target.position.y + 1.6,
            z: this.target.position.z
        };
    }

    updateCover(deltaTime) {
        if (Date.now() - this.lastStateChange > 3000) {
            this.changeState('CHASE');
        }
    }

    handleShooting() {
        if (!this.target || this.bot.ammo <= 0) return;

        const now = Date.now();
        
        // FIX: Aggiungi jitter al fire rate per variabilità
        const jitter = (Math.random() - 0.5) * 500; // ±250ms
        const fireDelay = 2000 + this.reactionTime + jitter;

        const targetAimPos = this.lookAtPos || {
            x: this.target.position.x,
            y: this.target.position.y + 1.6,
            z: this.target.position.z
        };

        if (now - this.lastShotTime > fireDelay) {
            // Verifica LOS prima di sparare
            if (!this.hasLineOfSight(this.bot.position, this.target.position)) {
                return;
            }

            const roll = Math.random();
            const shooterPos = { ...this.bot.position, y: this.bot.position.y + 1.6 };
            const dir = this.getDir(shooterPos, targetAimPos);

            if (roll < this.accuracy) {
                // Hit accurato
                this.gameState.handlePlayerShoot(this.bot.id, {
                    position: shooterPos,
                    direction: dir,
                    timestamp: now,
                    accuracy: 1.0
                });
            } else {
                // Miss con spread
                const spread = 0.2 * (1 - this.accuracy); // Più è scarso, più spread
                dir.x += (Math.random() - 0.5) * spread;
                dir.y += (Math.random() - 0.5) * spread;
                dir.z += (Math.random() - 0.5) * spread;
                
                this.gameState.handlePlayerShoot(this.bot.id, {
                    position: shooterPos,
                    direction: dir,
                    timestamp: now,
                    accuracy: 0.1
                });
            }
            
            this.lastShotTime = now;
        }
    }

    applyMovement(deltaTime) {
        const speed = GAME_CONSTANTS.WALK_SPEED * (this.gameState.movementSpeed || 1.0);

        const nextPos = {
            x: this.bot.position.x + this.moveDir.x * speed * deltaTime,
            y: this.bot.position.y,
            z: this.bot.position.z + this.moveDir.z * speed * deltaTime
        };

        if (!checkMapCollision(nextPos, GAME_CONSTANTS.PLAYER_RADIUS)) {
            this.bot.position = nextPos;
        } else {
            const now = Date.now();
            
            if (this.state === 'PATROL') {
                this.patrolTarget = this.getRandomPatrolPoint();
            } else if (now - this.collisionCooldown > 500) {
                // Cambia direzione gradualmente
                this.moveDir = {
                    x: (Math.random() - 0.5) * 2,
                    z: (Math.random() - 0.5) * 2
                };
                this.collisionCooldown = now;
            }
        }

        // Update rotation
        if (this.lookAtPos) {
            const dx = this.lookAtPos.x - this.bot.position.x;
            const dz = this.lookAtPos.z - this.bot.position.z;
            this.bot.rotation.yaw = Math.atan2(dx, dz);
        }
    }

    changeState(newState) {
        this.state = newState;
        this.lastStateChange = Date.now();
    }

    getDistance(a, b) {
        return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
    }

    getDir(from, to) {
        const dx = to.x - from.x;
        const dy = (to.y || from.y) - from.y;
        const dz = to.z - from.z;
        const mag = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        return { x: dx / mag, y: dy / mag, z: dz / mag };
    }
}
