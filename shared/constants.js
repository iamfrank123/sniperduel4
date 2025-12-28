// Shared game constants between client and server

export const GAME_CONSTANTS = {
    // Player Movement
    WALK_SPEED: 4.5,
    CROUCH_SPEED: 2.0,
    JUMP_VELOCITY: 4.9,
    GRAVITY: 20.0,
    PLAYER_HEIGHT: 1.8,
    PLAYER_RADIUS: 0.4,
    CROUCH_HEIGHT: 1.2,
    EYE_HEIGHT: 1.6,

    // Weapon Stats
    HEADSHOT_DAMAGE: 100,
    BODY_DAMAGE: 75,
    LIMB_DAMAGE: 50,
    BOLT_ACTION_TIME: 1.5,
    RELOAD_TIME: 2.5,
    MAGAZINE_SIZE: 5,
    RESERVE_AMMO: 20,

    // Accuracy
    HIP_ACCURACY: 0.05,
    SCOPED_STANDING: 0.95,
    SCOPED_CROUCHED: 0.99,
    MOVING_PENALTY: 0.7,
    JUMPING_ACCURACY: 0.0,
    MAX_SPREAD_ANGLE: 5.0,

    // Camera
    DEFAULT_FOV: 75,
    SCOPED_FOV: 45,
    FOV_TRANSITION_SPEED: 60,
    PITCH_MIN: -89,
    PITCH_MAX: 89,
    DEFAULT_SENSITIVITY: 0.0004,

    // Network
    TICK_RATE: 30,
    TICK_INTERVAL: 1000 / 30,
    MAX_PLAYERS: 12,
    MAX_LAG_COMPENSATION: 250,
    INTERPOLATION_DELAY: 100,

    // Game Rules
    MAX_HEALTH: 100,
    ROUNDS_TO_WIN: 999,
    ROUND_TIME: 180,
    RESPAWN_TIME: 0.5,

    // Map
    MAP_SIZE: 100,
    SPAWN_PROTECTION_TIME: 1
};

export const HITBOX_TYPES = {
    HEAD: 'HEAD',
    UPPER_BODY: 'UPPER_BODY',
    LOWER_BODY: 'LOWER_BODY',
    LEFT_ARM: 'LEFT_ARM',
    RIGHT_ARM: 'RIGHT_ARM',
    LEFT_LEG: 'LEFT_LEG',
    RIGHT_LEG: 'RIGHT_LEG'
};

export const WEAPON_STATES = {
    IDLE: 'IDLE',
    AIMING: 'AIMING',
    FIRING: 'FIRING',
    BOLT_ACTION: 'BOLT_ACTION',
    RELOADING: 'RELOADING'
};

export const MATCH_STATUS = {
    WAITING: 'WAITING',
    STARTING: 'STARTING',
    IN_PROGRESS: 'IN_PROGRESS',
    ROUND_END: 'ROUND_END',
    MATCH_END: 'MATCH_END'
};

export const PACKET_TYPES = {
    // Client -> Server
    INPUT_MOVEMENT: 'INPUT_MOVEMENT',
    SHOOT: 'SHOOT',
    RELOAD: 'RELOAD',
    SCOPE_TOGGLE: 'SCOPE_TOGGLE',

    // Server -> Client
    STATE_UPDATE: 'STATE_UPDATE',
    HIT_CONFIRMED: 'HIT_CONFIRMED',
    PLAYER_DIED: 'PLAYER_DIED',
    ROUND_START: 'ROUND_START',
    ROUND_END: 'ROUND_END',
    MATCH_END: 'MATCH_END'
};

export const BOT_DIFFICULTY = {
    FACILE: 'FACILE',
    MEDIO: 'MEDIO',
    DIFFICILE: 'DIFFICILE',
    VETERANO: 'VETERANO'
};

export const MATCH_MODES = {
    PVP: 'PVP',
    COOP_BOT: 'COOP_BOT',
    DEATHMATCH_BOT: 'DEATHMATCH_BOT'
};
