// Pause Menu - Manages in-game pause menu with settings
export class PauseMenu {
    constructor(game) {
        this.game = game;
        this.isOpen = false;

        // Settings
        this.settings = {
            fov: 65,
            sensitivity: 1.0,
            volume: 100
        };

        // Load settings first
        this.loadSettings();

        // Initialize DOM elements and event listeners (may not exist yet)
        this.initDOMElements();
        this.initFullscreenEnforcement();
    }

    initDOMElements() {
        // DOM Elements - check if they exist
        this.menuElement = document.getElementById('pause-menu');
        this.closeBtn = document.getElementById('pause-close-btn');
        this.resumeBtn = document.getElementById('pause-resume-btn');
        this.exitBtn = document.getElementById('pause-exit-btn');

        // Settings controls
        this.fovSlider = document.getElementById('pause-fov');
        this.fovValue = document.getElementById('pause-fov-value');
        this.sensitivitySlider = document.getElementById('pause-sensitivity');
        this.sensitivityValue = document.getElementById('pause-sensitivity-value');
        this.volumeSlider = document.getElementById('pause-volume');
        this.volumeValue = document.getElementById('pause-volume-value');
        this.fullscreenCheckbox = document.getElementById('pause-fullscreen');

        // Only init event listeners if elements exist
        if (this.menuElement && this.closeBtn && this.resumeBtn) {
            this.initEventListeners();
            this.updateUI();
        }
    }

    initEventListeners() {
        // Close buttons
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.hide());
        }
        if (this.resumeBtn) {
            this.resumeBtn.addEventListener('click', () => this.hide());
        }

        // Exit button
        if (this.exitBtn) {
            this.exitBtn.addEventListener('click', () => this.exitMatch());
        }

        // FOV slider
        if (this.fovSlider) {
            this.fovSlider.addEventListener('input', (e) => {
                this.settings.fov = parseInt(e.target.value);
                if (this.fovValue) this.fovValue.textContent = this.settings.fov;
                this.applySettings();
                this.saveSettings();
            });
        }

        // Sensitivity slider
        if (this.sensitivitySlider) {
            this.sensitivitySlider.addEventListener('input', (e) => {
                this.settings.sensitivity = parseFloat(e.target.value);
                if (this.sensitivityValue) this.sensitivityValue.textContent = this.settings.sensitivity.toFixed(1);
                this.applySettings();
                this.saveSettings();
            });
        }

        // Volume slider
        if (this.volumeSlider) {
            this.volumeSlider.addEventListener('input', (e) => {
                this.settings.volume = parseInt(e.target.value);
                if (this.volumeValue) this.volumeValue.textContent = this.settings.volume;
                this.applySettings();
                this.saveSettings();
            });
        }
    }

    updateUI() {
        // Update UI with current settings
        if (this.fovSlider) this.fovSlider.value = this.settings.fov;
        if (this.fovValue) this.fovValue.textContent = this.settings.fov;
        if (this.sensitivitySlider) this.sensitivitySlider.value = this.settings.sensitivity;
        if (this.sensitivityValue) this.sensitivityValue.textContent = this.settings.sensitivity.toFixed(1);
        if (this.volumeSlider) this.volumeSlider.value = this.settings.volume;
        if (this.volumeValue) this.volumeValue.textContent = this.settings.volume;
    }

    initFullscreenEnforcement() {
        // Fullscreen enforcement system
        this.fullscreenEnforced = false;

        document.addEventListener('fullscreenchange', () => {
            // If fullscreen is exited and menu is closed, re-enter fullscreen
            if (!document.fullscreenElement && this.fullscreenEnforced && !this.isOpen) {
                setTimeout(() => {
                    if (!this.isOpen) {
                        this.enterFullscreen();
                    }
                }, 100);
            }
        });
    }

    enterFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log('Fullscreen request failed:', err);
            });
        }
    }

    toggle() {
        if (this.isOpen) {
            this.hide();
        } else {
            this.show();
        }
    }

    show() {
        if (!this.menuElement) return; // Menu not available yet

        this.isOpen = true;
        this.menuElement.classList.remove('hidden');

        // Exit pointer lock to show cursor
        if (this.game.input) {
            this.game.input.exitPointerLock();
        }

        // Update UI with current settings
        this.updateUI();
    }

    hide() {
        if (!this.menuElement) return; // Menu not available yet

        this.isOpen = false;
        this.menuElement.classList.add('hidden');

        // Re-acquire pointer lock
        if (this.game.input && this.game.scene) {
            setTimeout(() => {
                this.game.input.requestPointerLock(this.game.scene.renderer.domElement);
            }, 100);
        }

        // Re-enforce fullscreen
        this.enterFullscreen();
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('sniperDuelSettings');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.settings = { ...this.settings, ...parsed };
            }
        } catch (e) {
            console.error('Failed to load settings:', e);
        }

        // Apply loaded settings
        this.applySettings();
    }

    saveSettings() {
        try {
            localStorage.setItem('sniperDuelSettings', JSON.stringify(this.settings));
        } catch (e) {
            console.error('Failed to save settings:', e);
        }
    }

    applySettings() {
        // Apply FOV
        if (this.game.player && this.game.scene) {
            this.game.scene.camera.fov = this.settings.fov;
            this.game.scene.camera.updateProjectionMatrix();
        }

        // Apply sensitivity
        if (this.game.player) {
            this.game.player.mouseSensitivity = this.settings.sensitivity;
        }

        // Apply volume (AudioManager doesn't have setVolume method, skip for now)
        // TODO: Implement volume control in AudioManager if needed
        if (this.game.audioManager && typeof this.game.audioManager.setVolume === 'function') {
            this.game.audioManager.setVolume(this.settings.volume / 100);
        }
    }

    exitMatch() {
        // Disconnect from server
        if (this.game.network) {
            this.game.network.disconnect();
        }

        // Exit fullscreen
        if (document.fullscreenElement) {
            document.exitPointerLock();
            document.exitFullscreen();
        }

        // Reload page to return to main menu
        window.location.reload();
    }

    enableFullscreenEnforcement() {
        this.fullscreenEnforced = true;
        this.enterFullscreen();
    }

    disableFullscreenEnforcement() {
        this.fullscreenEnforced = false;
    }
}
