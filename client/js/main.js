// Main entry point for the game
import { Game } from './game/Game.js';
import { UIManager } from './ui/UIManager.js';
import { NetworkManager } from './network/NetworkManager.js';
import { AudioManager } from './utils/AudioManager.js';

class App {
    constructor() {
        this.game = null;
        this.ui = new UIManager();
        this.network = new NetworkManager();
        this.audioManager = new AudioManager();

        this.init();
    }

    init() {
        // Initialize UI event listeners
        this.ui.addEventListener('createMatch', (e) => this.handleCreateMatch(e.detail));
        this.ui.addEventListener('playVsBot', (e) => this.handlePlayVsBot(e.detail));
        this.ui.addEventListener('joinMatch', (e) => this.handleJoinMatch(e.detail));
        this.ui.addEventListener('cancelLobby', () => this.handleCancelLobby());
        this.ui.addEventListener('returnToMenu', () => this.handleReturnToMenu());
        this.ui.addEventListener('lobbySettingsUpdated', (e) => this.handleUpdateSettings(e.detail));
        this.ui.addEventListener('startMatch', () => this.handleStartMatch());

        // Network event listeners
        this.network.addEventListener('matchCreated', (e) => this.onMatchCreated(e.detail));
        this.network.addEventListener('matchJoined', (e) => this.onMatchJoined(e.detail));
        this.network.addEventListener('opponentJoined', (e) => this.onOpponentJoined(e.detail));
        this.network.addEventListener('gameStart', (e) => this.startGame(e.detail));
        this.network.addEventListener('settingsUpdated', (e) => this.onSettingsUpdated(e.detail));
        this.network.addEventListener('disconnect', () => this.handleDisconnect());

        // Hide loading screen
        this.ui.hideLoading();
    }

    async handleCreateMatch(settings) {
        this.ui.showLoading();
        try {
            await this.network.createMatch(settings);
        } catch (error) {
            console.error('Failed to create match:', error);
            this.ui.showError('Failed to create match. Please try again.');
            this.ui.hideLoading();
        }
    }

    async handlePlayVsBot(settings) {
        this.ui.showLoading();
        try {
            await this.network.createBotMatch(settings);
        } catch (error) {
            console.error('Failed to create bot match:', error);
            this.ui.showError('Failed to create bot match. Please try again.');
            this.ui.hideLoading();
        }
    }

    async handleJoinMatch(data) {
        this.ui.showLoading();
        try {
            await this.network.joinMatch(data);
        } catch (error) {
            console.error('Failed to join match:', error);
            this.ui.showJoinError('Invalid code or match not found.');
            this.ui.hideLoading();
        }
    }

    handleCancelLobby() {
        this.network.disconnect();
        this.ui.showMainMenu();
    }

    handleUpdateSettings(settings) {
        this.network.sendUpdateSettings(settings);
    }

    handleStartMatch() {
        this.network.sendStartGame();
    }

    handleReturnToMenu() {
        if (this.game) {
            this.game.destroy();
            this.game = null;
        }
        this.network.disconnect();
        this.ui.showMainMenu();
    }

    handleDisconnect() {
        if (this.game) {
            this.game.destroy();
            this.game = null;
        }
        this.ui.showError('Disconnected from server');
        this.ui.showMainMenu();
    }

    onMatchCreated(data) {
        this.ui.hideLoading();
        const isBotMatch = data.settings && (data.settings.matchMode === 'COOP_BOT' || data.settings.matchMode === 'DEATHMATCH_BOT');
        this.ui.showLobby(data.inviteCode, true, isBotMatch);
        if (data.settings) {
            this.ui.updateLobbySettings(data.settings);
            this.lastSettings = data.settings;
        }
    }

    onMatchJoined(data) {
        this.ui.hideLoading();
        const isBotMatch = data.settings && (data.settings.matchMode === 'COOP_BOT' || data.settings.matchMode === 'DEATHMATCH_BOT');
        this.ui.showLobby(data.inviteCode, false, isBotMatch);
        this.ui.disableLobbySettings();
        if (data.settings) {
            this.ui.updateLobbySettings(data.settings);
            this.lastSettings = data.settings;
        }
    }

    onSettingsUpdated(data) {
        this.ui.updateLobbySettings(data.settings);
        this.lastSettings = data.settings;
        if (this.game && this.game.player) {
            this.game.player.applySettings(data.settings);
        }
    }

    onOpponentJoined(data) {
        this.ui.updateLobbyStatus('Opponent found! Starting game...');
        setTimeout(() => {
            // Server will send gameStart event
        }, 2000);
    }

    startGame() {
        console.log('App: startGame called');

        // Initialize game instance
        this.game = new Game(this.network, this.ui, this.audioManager);

        // Apply settings if available
        if (this.lastSettings && this.game.player) {
            this.game.player.applySettings(this.lastSettings);
        }

        // Hide all menus and show game
        this.ui.hideAllScreens();
        this.ui.showHUD();

        console.log('App: Canvas should be visible now');
        console.log('App: Canvas class:', document.getElementById('game-canvas').className);

        // Start game loop
        this.game.start();

        // Request pointer lock on first click
        const requestPointerLock = () => {
            if (this.game && this.game.running) {
                this.game.input.requestPointerLock(this.game.scene.renderer.domElement);
                // Optional: try fullscreen too
                document.documentElement.requestFullscreen().catch(err => {
                    console.log('Fullscreen not available:', err.message);
                });
            }
        };

        // Add click listener
        document.addEventListener('click', requestPointerLock, { once: true });

        console.log('App: Game started, click anywhere to lock pointer');
    }
}

// Start the application
window.addEventListener('DOMContentLoaded', () => {
    try {
        console.log("App starting...");
        window.app = new App();
        console.log("App initialized successfully");
    } catch (e) {
        console.error("Fatal error starting app:", e);
        alert("Error starting game: " + e.message + "\nCheck console for details.");
    }
});