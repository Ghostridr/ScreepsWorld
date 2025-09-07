// ESLint flat config for ScreepsWorld
// - Enables modern JS linting
// - Declares Screeps and Jest globals to avoid false positives

import js from '@eslint/js';
import globals from 'globals';

export default [
    // Ignore config files and non-target folders
    { ignores: ['configs/**', 'screeps.com/**', 'tutorial/**'] },
    js.configs.recommended,
    {
        languageOptions: {
        ecmaVersion: 2021,
        sourceType: 'script', // CommonJS style used by Screeps
        globals: {
            ...globals.node,
            ...globals.jest,
            // Screeps runtime globals
            Game: 'readonly',
            Memory: 'readonly',
            FIND_SOURCES: 'readonly',
            FIND_CONSTRUCTION_SITES: 'readonly',
            FIND_STRUCTURES: 'readonly',
            FIND_MY_SPAWNS: 'readonly',
            FIND_DROPPED_RESOURCES: 'readonly',
            FIND_HOSTILE_CREEPS: 'readonly',
            STRUCTURE_EXTENSION: 'readonly',
            STRUCTURE_SPAWN: 'readonly',
            STRUCTURE_TOWER: 'readonly',
            STRUCTURE_CONTAINER: 'readonly',
            STRUCTURE_ROAD: 'readonly',
            STRUCTURE_RAMPART: 'readonly',
            STRUCTURE_WALL: 'readonly',
            STRUCTURE_STORAGE: 'readonly',
            CONTROLLER_STRUCTURES: 'readonly',
            LOOK_STRUCTURES: 'readonly',
            LOOK_CONSTRUCTION_SITES: 'readonly',
            TERRAIN_MASK_WALL: 'readonly',
            TERRAIN_MASK_SWAMP: 'readonly',
            RESOURCE_ENERGY: 'readonly',
            BODYPART_COST: 'readonly',
            WORK: 'readonly',
            CARRY: 'readonly',
            MOVE: 'readonly',
            HEAL: 'readonly',
            RoomPosition: 'readonly',
            PathFinder: 'readonly',
            FIND_MY_CREEPS: 'readonly',
            OK: 'readonly',
            ERR_NOT_IN_RANGE: 'readonly',
            ERR_BUSY: 'readonly',
            ERR_NOT_ENOUGH_ENERGY: 'readonly',
            ERR_NOT_ENOUGH_RESOURCES: 'readonly',
            ERR_FULL: 'readonly',
            ERR_INVALID_TARGET: 'readonly',
            _: 'readonly',
        },
        },
        rules: {
        // Keep it friendly for learning; tighten over time
        'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        'no-undef': 'error',
        'no-console': 'off',
        eqeqeq: 'warn',
        'prefer-const': 'warn',
        },
        linterOptions: {
        reportUnusedDisableDirectives: true,
        },
    },
    // Ensure the ESLint config file itself is treated as ESM and not linted with script sourceType
    {
        files: ['eslint.config.mjs'],
        languageOptions: {
        sourceType: 'module',
        },
        rules: {},
    },
    // Tests: allow dev-style console and jest globals
    {
        files: ['tests/**/*.test.js'],
        languageOptions: {
        globals: {
            ...globals.jest,
            console: 'readonly',
        },
        },
        rules: {
        'no-console': 'off',
        },
    },
    // Production and Newbie Land: enforce smart strict equality (===/!==), allow == null checks
    {
        files: ['src/**/*.js', 'screeps_newbieland_net___21025/**/*.js'],
        rules: {
        eqeqeq: ['error', 'smart'],
        },
    },
    // Note: tutorials/** and screeps.com/** are ignored above
];
