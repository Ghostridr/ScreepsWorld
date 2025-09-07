/* eslint-env screeps */
// Centralized configuration (flat CommonJS). Keep it tiny and stable.
// Stores desired role counts, body templates, and say() default settings.

var Config = {};

// Baseline creep counts (used as fallback); dynamic counts are computed per room below
Config.ROLE_COUNTS = {
    harvester: 2,
    upgrader: 2,
    builder: 1,
    miner: 0,
    hauler: 0,
    healer: 0,
    repairer: 0,
};

// Dynamic desired counts are now delegated to the scaler module to keep this file small.
Config.getDesiredRoleCounts = function (room) {
    try {
        var scaler = require('config.scaler');
        return scaler.getDesiredRoleCounts(room, {
            ROLE_COUNTS: Config.ROLE_COUNTS,
            getBodyTemplate: Config.getBodyTemplate,
        });
    } catch (e) {
        // Fallback: return baseline counts if scaler missing/errored
        console.log('constants.js unused var:', e);
        return Config.ROLE_COUNTS;
    }
};

// Helpers
function costOf(body) {
    var sum = 0;
    for (var i = 0; i < body.length; i++) sum += BODYPART_COST[body[i]] || 0;
    return sum;
}
function repeatPattern(pattern, budget, maxParts) {
    var body = [];
    while (true) {
        for (var i = 0; i < pattern.length; i++) {
            var next = body.concat([pattern[i]]);
            if (next.length > maxParts) return body;
            if (costOf(next) > budget) return body;
            body = next;
        }
    }
}

// Scale body templates by energy capacity; try to “max out” within budget/50-part cap
Config.getBodyTemplate = function (role, room) {
    var cap = (room && room.energyCapacityAvailable) || 300;
    // lvl available if needed for future tuning
    var maxParts = 50;

    if (role === 'miner') {
        // Aim for up to 5 WORK to saturate a source; if budget smaller, take as many as fit
        var target = [WORK, WORK, WORK, WORK, WORK, MOVE];
        // Trim target to cap
        while (costOf(target) > cap && target.length > 2) target.splice(target.indexOf(WORK), 1);
        return target.length ? target : [WORK, WORK, MOVE];
    }
    if (role === 'hauler') {
        // 2CARRY:1MOVE pattern; repeat to fill budget
        var haul = repeatPattern([CARRY, CARRY, MOVE], cap, maxParts);
        return haul.length ? haul : [CARRY, CARRY, MOVE];
    }
    if (role === 'harvester') {
        // Early-game worker; repeat small worker kit until budget
        var hv = repeatPattern([WORK, CARRY, MOVE], cap, maxParts);
        return hv.length ? hv : [WORK, CARRY, MOVE];
    }
    if (role === 'builder' || role === 'upgrader') {
        // Balanced worker: try to keep 1 MOVE per 2 other parts
        var bw = repeatPattern([WORK, CARRY, MOVE], cap, maxParts);
        // Ensure at least one MOVE
        if (bw.indexOf(MOVE) === -1) bw.push(MOVE);
        return bw.length ? bw : [WORK, CARRY, MOVE];
    }
    if (role === 'repairer') {
        // Repairers behave like builders: WORK+CARRY+MOVE scaled; ensure mobility
        var rw = repeatPattern([WORK, CARRY, MOVE], cap, maxParts);
        if (rw.indexOf(MOVE) === -1) rw.push(MOVE);
        return rw.length ? rw : [WORK, CARRY, MOVE];
    }
    if (role === 'healer') {
        // Healer scaling: early keep 1:1 for mobility; mid/late pack 2 HEAL per MOVE (roads assumed)
        var lvlH = (room && room.controller && room.controller.level) || 1;
        var pattern = lvlH >= 6 ? [HEAL, HEAL, MOVE] : [HEAL, MOVE];
        var hk = repeatPattern(pattern, cap, maxParts);
        if (hk.indexOf(MOVE) === -1) hk.push(MOVE);
        return hk.length ? hk : [HEAL, MOVE];
    }
    return [WORK, CARRY, MOVE];
};

// Default settings for service.say (can be overridden in Memory.settings.say)
Config.SAY_DEFAULTS = {
    enabled: true,
    minInterval: 5,
    bucketFloor: 2000,
    // Fun pools cadence/gating
    funny: true,
    funEvery: 200,
    funBucketFloor: 4000,
    funnyLong: true,
    funLongEvery: 800,
    funLongBucketFloor: 8000,
};

// Optional: visual overrides consumed by config.paths (central control)
// Leave undefined to keep module defaults. Provide partial objects to override only what you need.
Config.VISUALS = {
    paths: {
        // How widths are interpreted: 'absolute' | 'delta' | 'multiplier'
        // Use 'delta' to make 0 mean baseline (normal), negatives thinner, positives thicker.
        widthMode: 'delta',
        // Line styles per kind: 'dashed' for "- - -", 'dotted' for "| | | |", or undefined for solid
        style: {
            move: 'dashed',
            blocked: 'dashed',
            planning: 'dotted',
        },
        // Global stroke widths
        widths: {
            // Baseline
            normal: 0,
            // Deltas relative to baseline (since widthMode='delta')
            move: 0, // ignored when style.move = 'none'
            blocked: 1.4, // final 2.4 when normal=1
            planningBuilt: -0.2, // final 0.8
            planningPlanned: -0.5, // final 0.5
            tower: 0.2, // final 1.2
            layout: 0, // final 1.0
        },
        // Global opacities
        opacities: {
            normal: 0.6,
            move: 0.6,
            blocked: 0.9,
            planningBuilt: 0.5,
            planningPlanned: 0.4,
            tower: 0.8,
            layout: 0.8,
        },
        // Pulse settings
        pulse: {
            enabled: true,
            period: 50,
            amplitude: 0.25,
            widthAmplitude: 0,
            kinds: { blocked: true, idle: true },
        },
    },
};

// Helper: list role names defined here
Config.getRoleNames = function () {
    return Object.keys(Config.ROLE_COUNTS);
};

// Optional: initialize Memory.settings.say with defaults without clobbering user edits
Config.init = function () {
    if (typeof Memory.settings !== 'object' || Memory.settings == null) Memory.settings = {};
    if (typeof Memory.settings.say !== 'object' || Memory.settings.say == null)
        Memory.settings.say = {};
    var s = Memory.settings.say;
    var d = Config.SAY_DEFAULTS;
    if (typeof s.enabled !== 'boolean') s.enabled = d.enabled;
    if (typeof s.minInterval !== 'number') s.minInterval = d.minInterval;
    if (typeof s.bucketFloor !== 'number') s.bucketFloor = d.bucketFloor;
    if (typeof s.funny !== 'boolean') s.funny = d.funny;
    if (typeof s.funEvery !== 'number') s.funEvery = d.funEvery;
    if (typeof s.funBucketFloor !== 'number') s.funBucketFloor = d.funBucketFloor;
    if (typeof s.funnyLong !== 'boolean') s.funnyLong = d.funnyLong;
    if (typeof s.funLongEvery !== 'number') s.funLongEvery = d.funLongEvery;
    if (typeof s.funLongBucketFloor !== 'number') s.funLongBucketFloor = d.funLongBucketFloor;
    return s;
};

module.exports = Config;
