// Esempio di integrazione nel tuo main.js o GameClient.js

import { InGameMenuManager } from './InGameMenuManager.js';

// Nel tuo GameClient class, aggiungi:

class GameClient {
    constructor() {
        this.socket = null;
        this.isGameActive = false;
        this.isPaused = false;
        
        // Inizializza il menu in-game
        this.inGameMenu = new InGameMenuManager(this);
        
        // ... resto del costruttore
    }

    // Metodo chiamato quando il gioco inizia
    onGameStart() {
        this.isGameActive = true;
        
        // Applica le impostazioni salvate
        const settings = this.inGameMenu.getSettings();
        
        if (this.camera) {
            this.camera.fov = settings.fov;
            this.camera.updateProjectionMatrix();
        }
        
        if (this.inputHandler) {
            this.inputHandler.sensitivity = settings.sensitivity;
        }
        
        // Forza schermo intero
        if (settings.fullscreen) {
            this.inGameMenu.requestFullscreen();
        }
    }

    // Metodo per pausare il gioco
    pauseGame() {
        this.isPaused = true;
        
        // Ferma il render loop se necessario
        // this.stopRenderLoop();
    }

    // Metodo per riprendere il gioco
    resumeGame() {
        this.isPaused = false;
        
        // Riprendi il render loop
        // this.startRenderLoop();
    }

    // Nel tuo render loop, aggiungi:
    update(deltaTime) {
        if (this.isPaused) {
            return; // Non aggiornare se in pausa
        }
        
        // ... resto della logica di update
    }

    // Metodo per gestire delta updates dal server
    onStateDelta(delta) {
        // Applica solo i cambiamenti ricevuti
        if (delta.timeRemaining !== undefined) {
            this.timeRemaining = delta.timeRemaining;
        }
        
        if (delta.scores !== undefined) {
            this.scores = delta.scores;
            this.updateScoreboard();
        }
        
        if (delta.players) {
            for (const [playerId, changes] of Object.entries(delta.players)) {
                const player = this.players.get(playerId);
                if (!player) continue;
                
                // Applica solo i cambiamenti specifici
                if (changes.position) {
                    player.position = changes.position;
                }
                
                if (changes.rotation) {
                    player.rotation = changes.rotation;
                }
                
                if (changes.health !== undefined) {
                    player.health = changes.health;
                }
                
                if (changes.isDead !== undefined) {
                    player.isDead = changes.isDead;
                }
            }
        }
    }

    // Nel tuo socket setup, aggiungi:
    setupSocketListeners() {
        // ... altri listener

        // Ascolta delta updates invece di full state
        this.socket.on('stateDelta', (delta) => {
            this.onStateDelta(delta);
        });

        // Mantieni anche il listener per full state (per sincronizzazione iniziale)
        this.socket.on('stateUpdate', (state) => {
            this.onFullStateUpdate(state);
        });
    }

    // Cleanup quando esci dal gioco
    cleanup() {
        this.isGameActive = false;
        
        if (this.inGameMenu) {
            this.inGameMenu.cleanup();
        }
        
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

// Esporta
export { GameClient };
