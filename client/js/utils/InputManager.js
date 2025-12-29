// Input Manager - Handles keyboard and mouse input
export class InputManager {
    constructor() {
        this.keys = {};
        this.mouse = {
            x: 0,
            y: 0,
            deltaX: 0,
            deltaY: 0,
            leftButton: false,
            rightButton: false
        };

        this.locked = false;
        this.canvas = null;

        // ESC key callback for pause menu
        this.onEscapeCallback = null;

        this.initEventListeners();
    }

    initEventListeners() {
        // Keyboard
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;

            // ESC or TAB key for pause menu (both work)
            if ((e.code === 'Escape' || e.code === 'Tab') && this.onEscapeCallback) {
                this.onEscapeCallback();
                e.preventDefault();
                return;
            }

            // Prevent default for game keys
            if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyC', 'KeyR'].includes(e.code)) {
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // Mouse movement
        document.addEventListener('mousemove', (e) => {
            if (this.locked) {
                this.mouse.deltaX += e.movementX || 0;
                this.mouse.deltaY += e.movementY || 0;
            }
        });

        // Mouse buttons
        document.addEventListener('mousedown', (e) => {
            if (this.locked) {
                if (e.button === 0) this.mouse.leftButton = true;
                if (e.button === 2) this.mouse.rightButton = true;
                e.preventDefault();
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.mouse.leftButton = false;
            if (e.button === 2) this.mouse.rightButton = false;
        });

        // Prevent context menu
        document.addEventListener('contextmenu', (e) => {
            if (this.locked) {
                e.preventDefault();
            }
        });

        // Pointer lock
        document.addEventListener('pointerlockchange', () => {
            this.locked = document.pointerLockElement !== null;
        });
    }

    onEscapePressed(callback) {
        this.onEscapeCallback = callback;
    }

    requestPointerLock(canvas) {
        this.canvas = canvas;
        canvas.requestPointerLock();
    }

    exitPointerLock() {
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
    }

    isKeyDown(code) {
        return this.keys[code] || false;
    }

    getMouseDelta() {
        const delta = {
            x: this.mouse.deltaX,
            y: this.mouse.deltaY
        };

        // Reset delta after reading
        this.mouse.deltaX = 0;
        this.mouse.deltaY = 0;

        return delta;
    }

    isMouseLeftDown() {
        return this.mouse.leftButton;
    }

    isMouseRightDown() {
        return this.mouse.rightButton;
    }

    getMovementInput() {
        let x = 0;
        let z = 0;

        if (this.isKeyDown('KeyW')) z -= 1;
        if (this.isKeyDown('KeyS')) z += 1;
        if (this.isKeyDown('KeyA')) x -= 1;
        if (this.isKeyDown('KeyD')) x += 1;

        // Normalize diagonal movement
        if (x !== 0 && z !== 0) {
            const length = Math.sqrt(x * x + z * z);
            x /= length;
            z /= length;
        }

        return { x, z };
    }

    isJumpPressed() {
        return this.isKeyDown('Space');
    }

    isCrouchPressed() {
        return this.isKeyDown('KeyC');
    }

    isReloadPressed() {
        return this.isKeyDown('KeyR');
    }
}
