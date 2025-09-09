// service.creeps.js — Registry & query helpers for creeps
// Responsibility: Centralize queries for creeps by role, room, and attributes. No direct game actions.

const lodash = require('lodash');
const Logger = require('util/logger');
const Creeps = module.exports;

/**
 * Get all creeps with a given role.
 * @param {string} role
 * @returns {Creep[]}
 */
// ...existing code...
Creeps.byRole = function (role) {
    return lodash.filter(Game.creeps, (c) => c.memory.role === role);
};

/**
 * Count creeps with a given role.
 * @param {string} role
 * @returns {number}
 */
Creeps.count = function (role) {
    return Creeps.byRole(role).length;
};

/**
 * Get all creeps in a given room.
 * @param {string} roomName
 * @returns {Creep[]}
 */
Creeps.inRoom = function (roomName) {
    return lodash.filter(Game.creeps, (c) => c.room.name === roomName);
};

/**
 * Get creeps by remaining ticks to live (e.g., for renewal).
 * @param {number} minTicks
 * @returns {Creep[]}
 */
Creeps.byLife = function (minTicks) {
    return lodash.filter(Game.creeps, (c) => c.ticksToLive >= minTicks);
};

/**
 * Get creeps by a custom task key in memory.
 * @param {string} taskKey
 * @returns {Creep[]}
 */
Creeps.byTask = function (taskKey) {
    return lodash.filter(Game.creeps, (c) => c.memory.task === taskKey);
};

// --- Metrics ---
/**
 * Average energy carried by all creeps.
 * @returns {number}
 */
Creeps.avgEnergy = function () {
    const creeps = Object.values(Game.creeps);
    const total = creeps.reduce(
        (sum, c) => sum + (c.store?.getUsedCapacity(RESOURCE_ENERGY) || 0),
        0
    );
    const avg = total / (creeps.length || 1);
    Logger.info('Creeps.avgEnergy', { avg, total, count: creeps.length });
    return avg;
};

/**
 * Average ticks to live for all creeps.
 * @returns {number}
 */
Creeps.avgTicksToLive = function () {
    const creeps = Object.values(Game.creeps);
    const total = creeps.reduce((sum, c) => sum + (c.ticksToLive || 0), 0);
    const avg = total / (creeps.length || 1);
    Logger.info('Creeps.avgTicksToLive', { avg, total, count: creeps.length });
    return avg;
};

// --- Advanced Queries ---

/**
 * Get creeps with a specific body part.
 * @param {string} part
 * @returns {Creep[]}
 */
Creeps.withBodyPart = function (part) {
    return lodash.filter(Game.creeps, (c) => c.body?.some((b) => b.type === part));
};

/**
 * Get creeps carrying more than a threshold of a resource.
 * @param {string} resource
 * @param {number} minAmount
 * @returns {Creep[]}
 */
Creeps.carryingMoreThan = function (resource, minAmount) {
    return lodash.filter(Game.creeps, (c) => (c.store?.getUsedCapacity(resource) || 0) > minAmount);
};

/**
 * Log summary metrics for all creeps (call in main loop for observability).
 */
Creeps.logSummary = function () {
    Logger.info('Creeps Summary', {
        count: Object.keys(Game.creeps).length,
        avgEnergy: Creeps.avgEnergy(),
        avgTicksToLive: Creeps.avgTicksToLive(),
    });
};
