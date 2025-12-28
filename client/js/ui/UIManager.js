// UI Manager - Handles all UI interactions and updates
export class UIManager extends EventTarget {
    constructor() {
        super();
        this.initElements();
        this.initEventListeners();
        this.loadSettings();
    }

    initElements() {
        // Screens
        this.mainMenu = document.getElementById('main-menu');
        this.joinScreen = document.getElementById('join-screen');
        this.lobbyScreen = document.getElementById('lobby-screen');
        this.settingsScreen = document.getElementById('settings-screen');
        this.loadingScreen = document.getElementById('loading-screen');
        this.gameStartScreen = document.getElementById('game-start-screen'); // New
        this.gameHUD = document.getElementById('game-hud');
        this.roundEndScreen = document.getElementById('round-end-screen');
        this.matchEndScreen = document.getElementById('match-end-screen');

        // Main Menu
        this.createMatchBtn = document.getElementById('create-match-btn');
        this.playVsBotBtn = document.getElementById('play-vs-bot-btn');
        this.joinMatchBtn = document.getElementById('join-match-btn');
        this.settingsBtn = document.getElementById('settings-btn');

        // Game Start Screen
        this.startCombatBtn = document.getElementById('start-combat-btn'); // New

        // Join Screen
        this.inviteCodeInput = document.getElementById('invite-code-input');
        this.joinConfirmBtn = document.getElementById('join-confirm-btn');
        this.joinBackBtn = document.getElementById('join-back-btn');
        this.joinError = document.getElementById('join-error');

        // Settings Elements
        this.sensitivitySlider = document.getElementById('sensitivity-slider');
        this.sensitivityValue = document.getElementById('sensitivity-value');
        this.volumeSlider = document.getElementById('volume-slider');
        this.volumeValue = document.getElementById('volume-value');
        this.fullscreenToggle = document.getElementById('fullscreen-toggle');
        this.settingsBackBtn = document.getElementById('settings-back-btn');

        // HUD Elements
        this.crosshair = document.getElementById('crosshair');
        this.hitMarker = document.getElementById('hit-marker');
        this.healthFill = document.getElementById('health-fill');
        this.healthText = document.getElementById('health-text');
        this.currentAmmo = document.getElementById('current-ammo');
        this.reserveAmmo = document.getElementById('reserve-ammo');
        this.scoreA = document.getElementById('score-a');
        this.scoreB = document.getElementById('score-b');
        this.nameA = document.getElementById('name-a');
        this.nameB = document.getElementById('name-b');
        this.killFeed = document.getElementById('kill-feed');
        this.leaderboard = document.getElementById('leaderboard');
        this.scopeOverlay = document.getElementById('scope-overlay');
        this.damageIndicator = document.getElementById('damage-indicator');

        // Nickname Inputs
        this.playerNicknameInput = document.getElementById('player-nickname');
        this.joinNicknameInput = document.getElementById('join-nickname');

        // Canvas
        this.canvas = document.getElementById('game-canvas');

        // Lobby Elements
        this.lobbyCode = document.getElementById('lobby-code');
        this.copyCodeBtn = document.getElementById('copy-code-btn');
        this.lobbyJumpValue = document.getElementById('lobby-jump-value');
        this.lobbyJumpInput = document.getElementById('lobby-jump-input');
        this.lobbySpeedValue = document.getElementById('lobby-speed-value');
        this.lobbySpeedInput = document.getElementById('lobby-speed-input');
        this.lobbyRoundsInput = document.getElementById('lobby-rounds-input');
        this.lobbyAutoRematchCheck = document.getElementById('lobby-auto-rematch');
        this.lobbyInfiniteAmmoCheck = document.getElementById('lobby-infinite-ammo');

        // Bot Settings
        this.botSettingsSection = document.getElementById('bot-settings-section');
        this.botDifficultyInput = document.getElementById('lobby-bot-difficulty');
        this.botCountValue = document.getElementById('lobby-bot-count-value');
        this.botCountInput = document.getElementById('lobby-bot-count-input');
        this.botModeInput = document.getElementById('lobby-bot-mode');
        this.botScoreValue = document.getElementById('lobby-bot-score-value');
        this.botScoreInput = document.getElementById('lobby-bot-score-input');
        this.botTimeValue = document.getElementById('lobby-bot-time-value');
        this.botTimeInput = document.getElementById('lobby-bot-time-input');

        this.lobbyStatus = document.getElementById('lobby-status');
        this.lobbyStartBtn = document.getElementById('lobby-start-btn');
        this.lobbyCancelBtn = document.getElementById('lobby-cancel-btn');
    }

    // Screen Management methods

    hideAllScreens() {
        this.mainMenu.classList.remove('active');
        this.joinScreen.classList.remove('active');
        this.lobbyScreen.classList.remove('active');
        this.settingsScreen.classList.remove('active');
        this.loadingScreen.classList.remove('active');
        this.gameStartScreen.classList.remove('active'); // New
        this.roundEndScreen.classList.remove('active');
        this.matchEndScreen.classList.remove('active');
    }

    showMainMenu() {
        this.hideAllScreens();
        this.gameHUD.classList.add('hidden');
        this.canvas.classList.remove('active');
        this.mainMenu.classList.add('active');
    }

    // ...

    showLoading() {
        this.loadingScreen.classList.add('active');
    }

    showGameStartOverlay(onStartCallback) {
        this.hideAllScreens();
        this.gameStartScreen.classList.add('active');

        // One-time listener
        const handler = () => {
            onStartCallback();
            this.startCombatBtn.removeEventListener('click', handler);
        };
        this.startCombatBtn.addEventListener('click', handler);
    }



    initEventListeners() {
        console.log("UIManager: initEventListeners called");

        // Main Menu
        this.createMatchBtn.addEventListener('click', () => {
            const nickname = this.playerNicknameInput.value.trim() || 'Player 1';
            const infiniteAmmo = document.getElementById('lobby-infinite-ammo')?.checked || false;

            this.dispatchEvent(new CustomEvent('createMatch', {
                detail: {
                    nickname,
                    rounds: 999, // default infinite
                    autoRematch: true,
                    infiniteAmmo
                }
            }));
        });

        this.playVsBotBtn.addEventListener('click', () => {
            const nickname = this.playerNicknameInput.value.trim() || 'Player 1';
            this.dispatchEvent(new CustomEvent('playVsBot', {
                detail: { nickname }
            }));
        });

        this.setupLobbySettingsListeners();

        this.joinMatchBtn.addEventListener('click', () => {
            this.showJoinScreen();
        });

        this.settingsBtn.addEventListener('click', () => {
            this.showSettings();
        });

        // Join Screen
        this.joinConfirmBtn.addEventListener('click', () => {
            const code = this.inviteCodeInput.value.trim().toUpperCase();
            const nickname = this.joinNicknameInput.value.trim() || 'Player 2';
            if (code.length === 6) {
                this.dispatchEvent(new CustomEvent('joinMatch', {
                    detail: { code, nickname }
                }));
            } else {
                this.showJoinError('Please enter a 6-character code');
            }
        });

        this.joinBackBtn.addEventListener('click', () => {
            this.showMainMenu();
        });

        this.inviteCodeInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
            this.joinError.textContent = '';
        });

        // Lobby
        this.copyCodeBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(this.lobbyCode.textContent);
            this.copyCodeBtn.textContent = 'Copied!';
            setTimeout(() => {
                this.copyCodeBtn.textContent = 'Copy Code';
            }, 2000);
        });

        this.lobbyCancelBtn.addEventListener('click', () => {
            this.dispatchEvent(new Event('cancelLobby'));
        });

        this.lobbyStartBtn.addEventListener('click', () => {
            this.dispatchEvent(new Event('startMatch'));
        });

        // Settings
        this.sensitivitySlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.sensitivityValue.textContent = value.toFixed(1);
            localStorage.setItem('sensitivity', value);
        });

        this.volumeSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.volumeValue.textContent = value + '%';
            localStorage.setItem('volume', value);
        });

        this.fullscreenToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.documentElement.requestFullscreen();
            } else {
                if (document.fullscreenElement) {
                    document.exitFullscreen();
                }
            }
            localStorage.setItem('fullscreen', e.target.checked);
        });

        this.settingsBackBtn.addEventListener('click', () => {
            this.showMainMenu();
        });

        // Match End
        const returnMenuBtn = document.getElementById('return-menu-btn');
        if (returnMenuBtn) {
            returnMenuBtn.addEventListener('click', () => {
                this.dispatchEvent(new Event('returnToMenu'));
            });
        }
    }

    setupLobbySettingsListeners() {
        // These elements are now class properties, no need to re-get them
        // const roundsInput = document.getElementById('lobby-rounds-input');
        // const autoRematchCheck = document.getElementById('lobby-auto-rematch');
        // const infiniteAmmoCheck = document.getElementById('lobby-infinite-ammo');
        // const speedInput = document.getElementById('lobby-speed-input');
        // const jumpInput = document.getElementById('lobby-jump-input');

        // const speedValue = document.getElementById('lobby-speed-value');
        // const jumpValue = document.getElementById('lobby-jump-value');

        if (this.lobbySpeedInput && this.lobbySpeedValue) {
            this.lobbySpeedInput.addEventListener('input', (e) => {
                this.lobbySpeedValue.textContent = parseFloat(e.target.value).toFixed(1);
            });
        }
        if (this.lobbyJumpInput && this.lobbyJumpValue) {
            this.lobbyJumpInput.addEventListener('input', (e) => {
                this.lobbyJumpValue.textContent = parseFloat(e.target.value).toFixed(1);
            });
        }

        const emitUpdate = () => {
            const detail = {
                movementSpeed: this.lobbySpeedInput ? parseFloat(this.lobbySpeedInput.value) : 1.0,
                jumpLevel: this.lobbyJumpInput ? parseFloat(this.lobbyJumpInput.value) : 1.0,
                botDifficulty: this.botDifficultyInput ? this.botDifficultyInput.value : 'MEDIO',
                botCount: this.botCountInput ? parseInt(this.botCountInput.value) : 0,
                botMode: this.botModeInput ? this.botModeInput.value : 'COOP_BOT',
                roundTime: this.botTimeInput ? parseInt(this.botTimeInput.value) : 180
            };

            if (this.lobbyRoundsInput) detail.rounds = parseInt(this.lobbyRoundsInput.value);
            else if (this.botScoreInput) detail.rounds = parseInt(this.botScoreInput.value); // Use score limit as rounds

            if (this.lobbyAutoRematchCheck) detail.autoRematch = this.lobbyAutoRematchCheck.checked;
            if (this.lobbyInfiniteAmmoCheck) detail.infiniteAmmo = this.lobbyInfiniteAmmoCheck.checked;

            this.dispatchEvent(new CustomEvent('lobbySettingsUpdated', { detail }));
        };

        if (this.lobbyRoundsInput) this.lobbyRoundsInput.addEventListener('change', emitUpdate);
        if (this.lobbyAutoRematchCheck) this.lobbyAutoRematchCheck.addEventListener('change', emitUpdate);
        if (this.lobbyInfiniteAmmoCheck) this.lobbyInfiniteAmmoCheck.addEventListener('change', emitUpdate);

        if (this.lobbySpeedInput && this.lobbySpeedValue) {
            this.lobbySpeedInput.addEventListener('input', () => {
                this.lobbySpeedValue.textContent = this.lobbySpeedInput.value;
                emitUpdate();
            });
        }

        if (this.lobbyJumpInput && this.lobbyJumpValue) {
            this.lobbyJumpInput.addEventListener('input', () => {
                this.lobbyJumpValue.textContent = this.lobbyJumpInput.value;
                emitUpdate();
            });
        }

        if (this.botDifficultyInput) this.botDifficultyInput.addEventListener('change', emitUpdate);

        if (this.botCountInput && this.botCountValue) {
            this.botCountInput.addEventListener('input', () => {
                this.botCountValue.textContent = this.botCountInput.value;
                emitUpdate();
            });
        }

        if (this.botModeInput) this.botModeInput.addEventListener('change', emitUpdate);

        if (this.botScoreInput && this.botScoreValue) {
            this.botScoreInput.addEventListener('input', () => {
                this.botScoreValue.textContent = this.botScoreInput.value;
                emitUpdate();
            });
        }

        if (this.botTimeInput && this.botTimeValue) {
            this.botTimeInput.addEventListener('input', () => {
                this.botTimeValue.textContent = this.botTimeInput.value;
                emitUpdate();
            });
        }
    }

    updateLobbySettings(settings) {
        // These elements are now class properties, no need to re-get them
        // const roundsInput = document.getElementById('lobby-rounds-input');
        // const autoRematchCheck = document.getElementById('lobby-auto-rematch');
        // const infiniteAmmoCheck = document.getElementById('lobby-infinite-ammo');
        // const speedInput = document.getElementById('lobby-speed-input');
        // const jumpInput = document.getElementById('lobby-jump-input');
        // const speedValue = document.getElementById('lobby-speed-value');
        // const jumpValue = document.getElementById('lobby-jump-value');

        if (this.lobbyRoundsInput && settings.rounds !== undefined) this.lobbyRoundsInput.value = settings.rounds;
        if (this.lobbyAutoRematchCheck && settings.autoRematch !== undefined) this.lobbyAutoRematchCheck.checked = settings.autoRematch;
        if (this.lobbyInfiniteAmmoCheck && settings.infiniteAmmo !== undefined) this.lobbyInfiniteAmmoCheck.checked = settings.infiniteAmmo;
        if (settings.movementSpeed !== undefined) {
            this.lobbySpeedInput.value = settings.movementSpeed;
            this.lobbySpeedValue.textContent = settings.movementSpeed;
        }
        if (settings.jumpLevel !== undefined) {
            this.lobbyJumpInput.value = settings.jumpLevel;
            this.lobbyJumpValue.textContent = settings.jumpLevel;
        }

        if (settings.matchMode === 'COOP_BOT' || settings.matchMode === 'DEATHMATCH_BOT') {
            const isHost = this.lobbyStartBtn && !this.lobbyStartBtn.classList.contains('hidden');
            if (isHost) {
                this.botSettingsSection.classList.remove('hidden');
            } else {
                this.botSettingsSection.classList.add('hidden');
            }
        } else {
            this.botSettingsSection.classList.add('hidden');
        }

        if (settings.botDifficulty !== undefined) this.botDifficultyInput.value = settings.botDifficulty;
        if (settings.botCount !== undefined) {
            this.botCountInput.value = settings.botCount;
            this.botCountValue.textContent = settings.botCount;
        }
        if (settings.botMode !== undefined) this.botModeInput.value = settings.botMode;
        if (settings.rounds !== undefined) {
            this.botScoreInput.value = settings.rounds;
            this.botScoreValue.textContent = settings.rounds;
        }
        if (settings.roundTime !== undefined) {
            this.botTimeInput.value = settings.roundTime;
            this.botTimeValue.textContent = settings.roundTime;
        }
    }

    disableLobbySettings() {
        if (this.lobbyRoundsInput) this.lobbyRoundsInput.disabled = true;
        if (this.lobbyAutoRematchCheck) this.lobbyAutoRematchCheck.disabled = true;
        if (this.lobbyInfiniteAmmoCheck) this.lobbyInfiniteAmmoCheck.disabled = true;
        if (this.lobbySpeedInput) this.lobbySpeedInput.disabled = true;
        if (this.lobbyJumpInput) this.lobbyJumpInput.disabled = true;

        if (this.botDifficultyInput) this.botDifficultyInput.disabled = true;
        if (this.botCountInput) this.botCountInput.disabled = true;
        if (this.botModeInput) this.botModeInput.disabled = true;
        if (this.botScoreInput) this.botScoreInput.disabled = true;
        if (this.botTimeInput) this.botTimeInput.disabled = true;
    }

    loadSettings() {
        const sensitivity = localStorage.getItem('sensitivity') || '1.0';
        const volume = localStorage.getItem('volume') || '100';
        const fullscreen = localStorage.getItem('fullscreen') === 'true';

        this.sensitivitySlider.value = sensitivity;
        this.sensitivityValue.textContent = parseFloat(sensitivity).toFixed(1);

        this.volumeSlider.value = volume;
        this.volumeValue.textContent = volume + '%';

        this.fullscreenToggle.checked = fullscreen;
    }

    getSensitivity() {
        return parseFloat(this.sensitivitySlider.value);
    }

    getVolume() {
        return parseInt(this.volumeSlider.value) / 100;
    }



    showJoinScreen() {
        this.hideAllScreens();
        this.joinScreen.classList.add('active');
        this.inviteCodeInput.value = '';
        this.joinError.textContent = '';
        this.inviteCodeInput.focus();
    }

    showLobby(code, isHost = false, isBotMatch = false) {
        this.hideAllScreens();
        this.lobbyScreen.classList.add('active');
        this.lobbyCode.textContent = code;
        this.lobbyStatus.textContent = isBotMatch ? 'Configure and START MATCH' : 'Waiting for opponent...';

        if (isHost) {
            this.lobbyStartBtn.classList.remove('hidden');
            if (isBotMatch) {
                this.botSettingsSection.classList.remove('hidden');
            } else {
                this.botSettingsSection.classList.add('hidden');
            }
        } else {
            this.lobbyStartBtn.classList.add('hidden');
            this.botSettingsSection.classList.add('hidden'); // Guests NEVER see bot controls
        }
    }

    showSettings() {
        this.hideAllScreens();
        this.settingsScreen.classList.add('active');
    }

    showLoading() {
        this.loadingScreen.classList.add('active');
    }

    hideLoading() {
        this.loadingScreen.classList.remove('active');
    }

    showHUD() {
        this.canvas.classList.add('active');
        this.gameHUD.classList.remove('hidden');
    }

    showError(message) {
        alert(message); // Simple for now, can be improved
    }

    showJoinError(message) {
        this.joinError.textContent = message;
    }

    updateLobbyStatus(status) {
        this.lobbyStatus.textContent = status;
    }

    // HUD Updates
    updateHealth(current, max = 100) {
        const percent = (current / max) * 100;
        this.healthFill.style.width = percent + '%';
        this.healthText.textContent = Math.max(0, current);

        // Color based on health
        if (percent > 60) {
            this.healthFill.style.background = 'linear-gradient(90deg, #4ade80, #22c55e)';
        } else if (percent > 30) {
            this.healthFill.style.background = 'linear-gradient(90deg, #fbbf24, #f59e0b)';
        } else {
            this.healthFill.style.background = 'linear-gradient(90deg, #ff6b6b, #ee5a6f)';
        }
    }

    updateAmmo(current, reserve, infinite = false) {
        if (infinite) {
            this.currentAmmo.textContent = '999';
            this.reserveAmmo.textContent = '999';
            this.currentAmmo.style.color = '#00ffff';
            return;
        }

        this.currentAmmo.textContent = current;
        this.reserveAmmo.textContent = reserve;

        if (current === 0) {
            this.currentAmmo.style.color = '#ff6b6b';
        } else if (current <= 2) {
            this.currentAmmo.style.color = '#fbbf24';
        } else {
            this.currentAmmo.style.color = '#fff';
        }
    }

    updateRound(current, total) {
        // No longer used in deathmatch
    }

    updateTimer(seconds) {
        // No longer used in deathmatch
    }

    updateScore(scores, playersData, localPlayerId) {
        if (!this.leaderboard || !scores || !playersData) return;

        // Clear existing
        this.leaderboard.innerHTML = '';

        // Create ranking
        const ranking = Object.keys(playersData).map(id => ({
            id,
            nickname: playersData[id].nickname,
            score: scores[id] || 0
        }));

        // Sort by score descending
        ranking.sort((a, b) => b.score - a.score);

        // Take top 6 (or all if fewer)
        ranking.slice(0, 6).forEach(player => {
            const entry = document.createElement('div');
            entry.className = 'leaderboard-entry';
            if (player.id === localPlayerId) entry.classList.add('local-player');

            entry.innerHTML = `
                <span class="name">${player.nickname}</span>
                <span class="score">${player.score}</span>
            `;
            this.leaderboard.appendChild(entry);
        });
    }

    showHitMarker(headshot = false) {
        this.hitMarker.classList.remove('hidden');
        this.hitMarker.style.color = headshot ? '#ff6b6b' : '#fff';
        setTimeout(() => {
            this.hitMarker.classList.add('hidden');
        }, 200);
    }

    showDamageIndicator() {
        this.damageIndicator.classList.remove('hidden');
        setTimeout(() => {
            this.damageIndicator.classList.add('hidden');
        }, 500);
    }

    showScope(show) {
        if (show) {
            this.scopeOverlay.classList.remove('hidden');
            this.crosshair.style.display = 'none';
        } else {
            this.scopeOverlay.classList.add('hidden');
            this.crosshair.style.display = 'block';
        }
    }

    addKillFeedEntry(killerName, victimName, headshot) {
        const entry = document.createElement('div');
        entry.className = 'kill-entry';
        entry.textContent = `${killerName} - ${victimName}${headshot ? ' 💀' : ''}`;

        this.killFeed.appendChild(entry);

        // Remove after 5 seconds
        setTimeout(() => {
            entry.remove();
        }, 5000);

        // Keep max 5 entries
        while (this.killFeed.children.length > 5) {
            this.killFeed.firstChild.remove();
        }
    }

    showRoundEnd(won, details) {
        this.roundEndScreen.classList.add('active');
        document.getElementById('round-result').textContent = won ? 'VICTORY' : 'DEFEAT';
        document.getElementById('round-details').textContent = details;

        let countdown = 5;
        const countdownEl = document.getElementById('next-round-countdown');
        const interval = setInterval(() => {
            countdown--;
            countdownEl.textContent = countdown;
            if (countdown <= 0) {
                clearInterval(interval);
                this.roundEndScreen.classList.remove('active');
            }
        }, 1000);
    }

    showMatchEnd(won, scores, playersData) {
        this.matchEndScreen.classList.add('active');
        document.getElementById('match-result').textContent = won ? 'VICTORY' : 'DEFEAT';

        const finalScoreEl = document.getElementById('final-score-display');
        finalScoreEl.innerHTML = '';

        if (scores && playersData) {
            const ranking = Object.keys(playersData).map(id => ({
                nickname: playersData[id].nickname,
                score: scores[id] || 0
            })).sort((a, b) => b.score - a.score);

            ranking.forEach(p => {
                const div = document.createElement('div');
                div.textContent = `${p.nickname}: ${p.score}`;
                finalScoreEl.appendChild(div);
            });
        }
    }
}
