/* eslint-env screeps */
// Centralized configuration (flat CommonJS). Keep it tiny and stable.
// Stores desired role counts, body templates, and say() default settings.

var Config = {};

// Baseline creep counts (used as fallback); dynamic counts are computed per room below
Config.ROLE_COUNTS = {
    harvester: 2,
    upgrader: 1,
    builder: 1,
    miner: 0,
    hauler: 0,
};

// Dynamic desired counts per RCL (adaptive policy). Per-room overrides can still use ROLE_COUNTS.
// Heuristics aim for steady spawn uptime and minimal path congestion.
Config.getDesiredRoleCounts = function (room) {
    var base = Config.ROLE_COUNTS;
    if (!room || !room.controller) return base;
    var lvl = room.controller.level || 1;
    var sources = room.find ? room.find(FIND_SOURCES).length : 2;
    var sites = room.find ? room.find(FIND_CONSTRUCTION_SITES).length : 0;
    var containers = room.find
        ? room.find(FIND_STRUCTURES, { filter: (s) => s.structureType === STRUCTURE_CONTAINER })
              .length
        : 0;
    var hasStorage = !!room.storage;
    var storageEnergy =
        hasStorage && room.storage.store ? room.storage.store[RESOURCE_ENERGY] || 0 : 0;

    // Approximate average range from sources to nearest spawn (cheap distance, no pathfinder)
    function avgSourceRangeToSpawn(r) {
        try {
            var spawns = r.find ? r.find(FIND_MY_SPAWNS) : [];
            if (!spawns || spawns.length === 0) return 20;
            var srcs = r.find ? r.find(FIND_SOURCES) : [];
            if (!srcs || srcs.length === 0) return 20;
            var total = 0;
            for (var i = 0; i < srcs.length; i++) {
                var s = srcs[i];
                var best = 9999;
                for (var j = 0; j < spawns.length; j++) {
                    var d = s.pos.getRangeTo(spawns[j]);
                    if (d < best) best = d;
                }
                total += best;
            }
            return Math.max(5, Math.round(total / srcs.length));
        } catch (e) {
            void e;
            return 20;
        }
    }
    var rangeAvg = avgSourceRangeToSpawn(room);

    // Start with safe defaults
    var d = { harvester: 2, upgrader: 1, builder: 1, miner: 0, hauler: 0 };

    if (lvl <= 1) {
        // Bootstrapping: harvesters do everything; 1–2 builders if sites exist
        d.harvester = Math.max(2, Math.min(4, sources * 2));
        d.builder = Math.min(2, sites > 0 ? 1 + Math.floor(sites / 5) : 1);
        d.upgrader = 1;
        d.miner = 0;
        d.hauler = 0;
    } else if (lvl === 2) {
        // Introduce miners/haulers once containers exist; otherwise rely on harvesters
        var miners = containers > 0 ? Math.min(sources, containers) : 0;
        d.miner = miners;
        d.harvester = miners >= sources ? 1 : Math.max(2, Math.min(4, sources * 2));
        d.hauler = miners > 0 ? 1 : 0; // one hauler once we have at least one miner seat
        d.builder = Math.min(3, Math.max(1, Math.ceil(sites / 4)));
        d.upgrader = 2;
    } else {
        // RCL3+: stabilized economy
        d.miner = sources; // one static miner per source
        // Haulers: scale with geometry and storage presence
        var haulFactor = Math.max(1, Math.round(rangeAvg / 12)); // 1 compact, 2 medium, 3 stretched
        d.hauler = Math.min(5, haulFactor + (hasStorage ? 1 : 0));
        d.harvester = 0; // miners replace harvesters
        d.builder = Math.min(4, Math.max(1, 1 + Math.floor(sites / 5)));
        // Upgraders: increase when storage has a healthy bank
        d.upgrader = hasStorage ? (storageEnergy > 40000 ? 4 : 3) : 2;
    }

    // Safety rails
    if (d.miner > 0 && d.hauler < 1) d.hauler = 1; // never miners without haulers
    if (containers > 0 && d.miner === 0 && d.harvester < 1) d.harvester = 1; // ensure one worker
    // Ensure at least one worker role overall
    if (d.harvester + d.builder + d.upgrader === 0) d.harvester = 1;

    // Allow Memory overrides per room via Memory.rooms[room.name].roleCounts
    try {
        if (
            Memory &&
            Memory.rooms &&
            Memory.rooms[room.name] &&
            Memory.rooms[room.name].roleCounts
        ) {
            var ov = Memory.rooms[room.name].roleCounts;
            for (var k in ov) if (Object.prototype.hasOwnProperty.call(ov, k)) d[k] = ov[k];
        }
    } catch (e) {
        void e;
    }
    return d;
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
