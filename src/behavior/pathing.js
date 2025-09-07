/* eslint-env screeps */
// service.pathing.js — global path reuse + per‑creep cursor + stuck detection (single writer of Memory.pathCache)
// Responsibility: provide cheap movement primitives that reuse PathFinder results across creeps.
// Exports: get(from,to,opts), step(creep,target,opts), invalidate(key)
// Memory shape: Memory.pathCache[key] = { p: [posKey,...], e: expiryTick, t: lastTouch }

// Professional caching utility for path results
const Cache = require('util.caching');
const Mapper = require('util.mapper');
const Debug = require('config.debug');
const Log = require('util.logger').withTag('pathing');

const MAX_ENTRIES = 200; // LRU cap (early game); tune upward later.
const DEFAULT_TTL = 180; // ticks before automatic recompute.
const STUCK_THRESHOLD = 3; // stationary ticks before bypass path attempt.
const BYPASS_TTL = 8; // ticks a bypass path remains valid
const REPATH_AFTER = 25; // optional hard refresh age for base path
// NEW: CPU / search tuning knobs
const MIN_BUCKET_BYPASS = 1500; // skip expensive bypass when bucket very low
const MIN_BUCKET_EARLY_REPATH = 1200; // skip early small repaths when bucket low
const EARLY_REPATH_COOLDOWN = 3; // ticks between early repaths per creep

// --- Movement refinement tuning knobs (added) ---
// Threshold (consecutive blocked ticks) before building a full bypass path.
// We still may fast-track a bypass earlier if on a road corridor (see below).
const BLOCK_BYPASS_THRESHOLD = 2;
// Enable a one-tick micro sidestep attempt (adjacent tile) on first block.
const ENABLE_MICRO_SIDESTEP = true;
// Allow sidestep tiles to increase range to goal by at most this amount (0 = must not worsen).
const MICRO_SIDESTEP_MAX_RANGE_INCREASE = 0;
// When both current tile & blocked next tile are road / road site, create a bypass immediately (even on first block).
const FAST_BYPASS_ON_ROAD_CORRIDOR = true;
// While on a bypass path, if the creep becomes adjacent to any upcoming step of the original base path,
// snap back to the base path even if not yet standing on a road (tightens reconvergence).
const REJOIN_WHEN_ADJACENT_TO_BASE = true;
// Allow attempted two-way creep swaps (lets movers "pass" a stationary builder/miner on a site)
const ENABLE_CREEP_SWAP = true;

// Precompute non-walkable structure types from engine constant (falls back to known list if absent)
const NON_WALKABLE_SET = new Set(
    (typeof OBSTACLE_OBJECT_TYPES !== 'undefined' && OBSTACLE_OBJECT_TYPES) || [
        STRUCTURE_SPAWN,
        STRUCTURE_EXTENSION,
        STRUCTURE_WALL,
        STRUCTURE_TOWER,
        STRUCTURE_STORAGE,
        STRUCTURE_OBSERVER,
        STRUCTURE_POWER_SPAWN,
        STRUCTURE_LAB,
        STRUCTURE_TERMINAL,
        STRUCTURE_NUKER,
        STRUCTURE_FACTORY,
        STRUCTURE_LINK,
    ]
);
function isWalkableStructure(struct) {
    if (!struct) return true;
    const t = struct.structureType;
    if (t === STRUCTURE_ROAD || t === STRUCTURE_CONTAINER || t === STRUCTURE_PORTAL) return true;
    if (t === STRUCTURE_RAMPART) return struct.my || struct.isPublic; // friendly/public ramparts walkable
    return !NON_WALKABLE_SET.has(t);
}

// Ephemeral same-tick lane reservations (not stored in Memory) to reduce herd pile-ups on
// the identical first path step. Reset each tick; second claimant to a tile treats it as blocked.
function reserveStep(creep, stepKey) {
    if (!stepKey) return true;
    if (!global.__laneRes || global.__laneRes.t !== Game.time) {
        global.__laneRes = { t: Game.time, map: Object.create(null), collisions: 0 };
    }
    const r = global.__laneRes;
    const holder = r.map[stepKey];
    if (holder && holder !== creep.name) {
        r.collisions++;
        return false; // conflict
    }
    r.map[stepKey] = creep.name;
    return true;
}

// Cost tuning — stronger road preference & adjacency encouragement
const ROAD_COST = 1;
const ROAD_SITE_COST = 1;
const ADJ_ROAD_COST = 3; // tiles adjacent to roads / road sites (soft encourage rejoin)
const PLAIN_COST = 4; // baseline plain (higher than default 2 so roads far more attractive)
const SWAMP_COST = 12; // swamp remains worst
// Planned (not yet built) road tiles mask (optional Memory-driven) get an intermediate cost so
// paths prefer them over plains but still favor actual roads / construction sites.
const PLANNED_ROAD_COST = 2; // between ROAD_COST (1) and ADJ_ROAD_COST (3)
// Set Memory.debugPathing = true to get per-step visualize line and occasional logs

// Debug helper: emit structured reason messages (only when Debug flag pathing.verbose enabled)
function dbg(creep, reason, fields) {
    if (!Debug.is || !Debug.is('pathing.verbose')) return;
    try {
        let msg = '[PATHDBG] ' + reason + ' ' + (creep && creep.name);
        if (fields) {
            for (const k in fields) {
                const v = fields[k];
                if (v !== undefined) msg += ' ' + k + '=' + v;
            }
        }
        console.log(msg);
    } catch (e) {
        Log.error(
            [
                'PATHING ERROR: dbg() failed',
                'Reason: ' + reason,
                'Fields: ' + JSON.stringify(fields, null, 2),
                'Error: ' + (e && e.message),
                'Stack:',
                e && e.stack,
            ].join('\n')
        );
    }
}

// Ultra‑detailed one‑line snapshot for a creep's movement state; gated by pathing.detail to avoid spam.
// Shows: position, goal, path type, index, lengths, stuck counters, block counters, last intended step,
// reservation conflicts, occupants, next tile structure classes, and age of base path.
function dbgDetail(creep, base, activePath, context) {
    if (!Debug.is || !Debug.is('pathing.detail')) return;
    try {
        const posKey = Mapper.toPosKey(creep.pos);
        const goal = base.goal;
        const isBypass = activePath !== base;
        const i = activePath.i;
        const len = (activePath.p && activePath.p.length) || 0;
        const baseLen = (base.p && base.p.length) || 0;
        const stuck = base.stuck || 0;
        const blk = activePath.blocked || 0;
        const ls = activePath.ls || '-';
        const lsAge = activePath._lsAge || 0;
        const createdAge = Game.time - (base.created || Game.time);
        let occNames = '';
        if (context && context.nextPos && creep.room && creep.room.lookForAt) {
            try {
                const occ =
                    creep.room.lookForAt(LOOK_CREEPS, context.nextPos.x, context.nextPos.y) || [];
                occNames = occ
                    .filter((c) => c.name !== creep.name)
                    .map((c) => c.name)
                    .join(',');
            } catch (e) {
                Log.error(
                    [
                        'PATHING ERROR: dbgDetail() failed (occupancy)',
                        'Creep: ' + (creep && creep.name),
                        'Error: ' + (e && e.message),
                        'Stack:',
                        e && e.stack,
                    ].join('\n')
                );
            }
        }
        let structTypes = '';
        if (context && context.nextPos && creep.room && creep.room.lookForAt) {
            try {
                const ss =
                    creep.room.lookForAt(LOOK_STRUCTURES, context.nextPos.x, context.nextPos.y) ||
                    [];
                structTypes = ss
                    .map((s) => s.structureType[0] + (isWalkableStructure(s) ? '' : '!'))
                    .join(',');
            } catch (e) {
                Log.error(
                    [
                        'PATHING ERROR: dbgDetail() failed (structTypes)',
                        'Creep: ' + (creep && creep.name),
                        'Error: ' + (e && e.message),
                        'Stack:',
                        e && e.stack,
                    ].join('\n')
                );
            }
        }
        const reserved = activePath._reserved ? 'Y' : 'N';
        const bypass = base.bypass ? 'Y' : 'N';
        const bypassExp = base.bypass ? base.bypass.expires - Game.time : 0;
        const lastReason = base._lastStuckReason || '-';
        const laneColl =
            global.__laneRes && global.__laneRes.t === Game.time ? global.__laneRes.collisions : 0;
        console.log(
            '[PATHDBG_DETAIL]',
            creep.name,
            `pos=${posKey} goal=${goal} tp=${isBypass ? 'BYP' : 'BASE'} i=${i}/${len} baseLen=${baseLen}` +
                ` stuck=${stuck} blk=${blk} ls=${ls} lsAge=${lsAge} createdAge=${createdAge}` +
                ` bypass=${bypass} bxTTL=${bypassExp}` +
                ` resv=${reserved} laneColl=${laneColl}` +
                ` occ=${occNames || '-'} structs=${structTypes || '-'} last=${lastReason}`
        );
    } catch (e) {
        Log.error(
            [
                'PATHING ERROR: dbgDetail() failed',
                'Creep: ' + (creep && creep.name),
                'Error: ' + (e && e.message),
                'Stack:',
                e && e.stack,
            ].join('\n')
        );
    }
}

// Rich event emitter (gated by pathing.causes OR pathing.detail) providing cause-oriented diagnostics.
function dbgCause(creep, phase, info) {
    if (!Debug.is) return;
    if (!Debug.is('pathing.causes') && !Debug.is('pathing.detail')) return;
    try {
        let out = '[PATHCAUSE] ' + phase + ' ' + creep.name;
        for (const k in info) {
            const v = info[k];
            if (v === undefined || v === null || v === '') continue;
            if (typeof v === 'object') out += ' ' + k + '=' + JSON.stringify(v);
            else out += ' ' + k + '=' + v;
        }
        console.log(out);
    } catch (e) {
        Log.error(
            [
                'PATHING ERROR: dbgCause() failed',
                'Phase: ' + phase,
                'Info: ' + JSON.stringify(info, null, 2),
                'Error: ' + (e && e.message),
                'Stack:',
                e && e.stack,
            ].join('\n')
        );
    }
}

function classifyNextTile(creep, nextPos) {
    const result = {
        occNames: [],
        occRoles: [],
        structs: [],
        unwalkable: [],
        hasSite: false,
    };
    if (!creep.room || !nextPos) return result;
    try {
        const creepsAt = creep.room.lookForAt(LOOK_CREEPS, nextPos.x, nextPos.y) || [];
        for (const c of creepsAt) {
            if (!c || c.name === creep.name) continue;
            result.occNames.push(c.name);
            if (c.memory && c.memory.role) result.occRoles.push(c.memory.role);
        }
    } catch (e) {
        Log.error(
            [
                'PATHING ERROR: classifyNextTile() failed (creeps)',
                'Creep: ' + (creep && creep.name),
                'Pos: ' + JSON.stringify(nextPos),
                'Error: ' + (e && e.message),
                'Stack:',
                e && e.stack,
            ].join('\n')
        );
    }
    try {
        const structs = creep.room.lookForAt(LOOK_STRUCTURES, nextPos.x, nextPos.y) || [];
        for (const s of structs) {
            result.structs.push(s.structureType);
            if (!isWalkableStructure(s)) result.unwalkable.push(s.structureType);
        }
        const sites = creep.room.lookForAt(LOOK_CONSTRUCTION_SITES, nextPos.x, nextPos.y) || [];
        result.hasSite = sites.length > 0;
    } catch (e) {
        Log.error(
            [
                'PATHING ERROR: classifyNextTile() failed (structs/sites)',
                'Creep: ' + (creep && creep.name),
                'Pos: ' + JSON.stringify(nextPos),
                'Error: ' + (e && e.message),
                'Stack:',
                e && e.stack,
            ].join('\n')
        );
    }
    return result;
}

function computeCause(tileInfo, reservationConflict, mv, fatigue, lsMismatch) {
    if (fatigue) return 'fatigue';
    if (reservationConflict) return 'reservationConflict';
    if (tileInfo.unwalkable.length) return 'structureObstacle';
    if (tileInfo.occNames.length) return 'creepOccupancy';
    if (lsMismatch && mv === OK) return 'ghostBlock';
    return 'none';
}

function ensureStore() {
    if (!Memory.pathCache) Memory.pathCache = {};
    return Memory.pathCache;
}

function lruTrim(store) {
    const keys = Object.keys(store);
    if (keys.length <= MAX_ENTRIES) return;
    keys.sort((a, b) => (store[a].t || 0) - (store[b].t || 0))
        .slice(0, keys.length - MAX_ENTRIES)
        .forEach((k) => delete store[k]);
}

function makeKey(fromPos, toPos, range) {
    // Symmetry NOT desired (direction matters for early steps) → include full from/to
    const fk = Mapper.toPosKey(fromPos);
    const tk = Mapper.toPosKey(toPos);
    if (!fk || !tk) return null;
    return fk + '>' + tk + '|' + (range || 1);
}

function serializePath(path) {
    const out = new Array(path.length);
    for (let i = 0; i < path.length; i++) {
        const p = path[i];
        out[i] = Mapper.toPosKey(p);
    }
    return out;
}

function deserializeStep(posKey) {
    return Mapper.fromPosKey(posKey); // returns RoomPosition (in game) or plain obj (tests)
}

function buildCostMatrix(roomName, opts) {
    // Road + road construction site preference with adjacency encouragement
    // NOTE: Road construction sites are PASSABLE. We assign them ROAD_SITE_COST (1) so they are
    // attractive but they do not block movement. Stalls near them are almost always creep
    // congestion, not the site itself.
    const ttl = 50; // Cost matrix TTL (ticks); adjust as needed
    const cachedCM = Cache.get('costMatrix:' + roomName);
    if (cachedCM) {
        if (opts && opts.debug) {
            Log.info(`Returning cached cost matrix for ${roomName}`);
        }
        return cachedCM;
    }
    if (!global.__pathCMCache) global.__pathCMCache = { t: -1, map: Object.create(null) };
    const t = Game.time;
    const cache = global.__pathCMCache;
    if (cache.t !== t) {
        cache.t = t;
        cache.map = Object.create(null);
    }
    if (cache.map[roomName]) {
        Cache.set('costMatrix:' + roomName, cache.map[roomName], ttl);
        return cache.map[roomName];
    }
    const room = Game.rooms && Game.rooms[roomName];
    const cm = new PathFinder.CostMatrix();
    if (room) {
        const terrain = room.getTerrain();
        const roads = room.find(FIND_STRUCTURES, {
            filter: (s) => s.structureType === STRUCTURE_ROAD,
        });
        const roadSites = room.find(FIND_CONSTRUCTION_SITES, {
            filter: (c) => c.structureType === STRUCTURE_ROAD,
        });
        const roadLike = [];
        for (let i = 0; i < roads.length; i++) {
            const p = roads[i].pos;
            cm.set(p.x, p.y, ROAD_COST);
            roadLike.push(p);
        }
        for (let i = 0; i < roadSites.length; i++) {
            const p = roadSites[i].pos;
            // Only set if not already set by actual road
            if (cm.get(p.x, p.y) === 0) cm.set(p.x, p.y, ROAD_SITE_COST);
            roadLike.push(p);
        }
        // Planned road mask support: allow external planner to hint future road network.
        // Memory shapes supported:
        // - Memory.rooms[room].plannedRoads = ["x,y", ...] or [{x,y}, ...]
        // - Memory.rooms[room].roadPlanner.planned = same shapes
        try {
            const rmem = Memory.rooms && Memory.rooms[roomName];
            let planned = [];
            if (rmem) {
                if (Array.isArray(rmem.plannedRoads)) planned = rmem.plannedRoads;
                else if (rmem.roadPlanner && Array.isArray(rmem.roadPlanner.planned))
                    planned = rmem.roadPlanner.planned;
            }
            for (let i = 0; i < planned.length; i++) {
                let x, y;
                const entry = planned[i];
                if (typeof entry === 'string') {
                    const parts = entry.split(',');
                    if (parts.length === 2) {
                        x = parts[0] | 0;
                        y = parts[1] | 0;
                    }
                } else if (entry && typeof entry === 'object') {
                    x = entry.x | 0;
                    y = entry.y | 0;
                }
                if (x == null || y == null) continue;
                if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
                if (x < 0 || y < 0 || x > 49 || y > 49) continue; // only accept valid room bounds
                if (cm.get(x, y) === 0) {
                    cm.set(x, y, PLANNED_ROAD_COST);
                    roadLike.push({ x, y });
                }
            }
        } catch (e) {
            Log.error(
                [
                    'PATHING ERROR: buildCostMatrix() failed (planned roads)',
                    'Room: ' + roomName,
                    'Error: ' + (e && e.message),
                    'Stack:',
                    e && e.stack,
                ].join('\n')
            );
        }
        // Adjacency encouragement: slight reduction vs plain for tiles near roads/road sites
        for (let i = 0; i < roadLike.length; i++) {
            const rp = roadLike[i];
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    if (!dx && !dy) continue;
                    const x = rp.x + dx;
                    const y = rp.y + dy;
                    if (x < 0 || y < 0 || x > 49 || y > 49) continue;
                    if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;
                    const existing = cm.get(x, y);
                    if (existing === 0) cm.set(x, y, ADJ_ROAD_COST);
                }
            }
        }
    }
    cache.map[roomName] = cm;
    Cache.set('costMatrix:' + roomName, cm, ttl);
    return cm;
}

// Safe RoomPosition creator (returns null if invalid); prevents engine 'Invalid coordinate' spam.
function safePos(x, y, roomName) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    if (x < 0 || y < 0 || x > 49 || y > 49) return null;
    try {
        return new RoomPosition(x, y, roomName);
    } catch (e) {
        Log.error(
            [
                'PATHING ERROR: safePos() failed',
                'Coords: x=' + x + ', y=' + y + ', room=' + roomName,
                'Error: ' + (e && e.message),
                'Stack:',
                e && e.stack,
            ].join('\n')
        );
        return null;
    }
}

function isValidPosObject(pos) {
    return (
        pos &&
        Number.isFinite(pos.x) &&
        Number.isFinite(pos.y) &&
        pos.x >= 0 &&
        pos.y >= 0 &&
        pos.x <= 49 &&
        pos.y <= 49 &&
        pos.roomName
    );
}

function runSearch(fromPos, toPos, range, pfOpts) {
    // Endpoint validation; if either endpoint invalid, log & abort early.
    const fpValid = isValidPosObject(fromPos);
    const tpValid = isValidPosObject(toPos);
    if (!fpValid || !tpValid) {
        if (Debug.is && Debug.is('pathing.verbose')) {
            try {
                console.log(
                    '[PATHDBG] invalid:endpoint',
                    JSON.stringify({
                        from: fromPos && { x: fromPos.x, y: fromPos.y, r: fromPos.roomName },
                        to: toPos && { x: toPos.x, y: toPos.y, r: toPos.roomName },
                        fpValid,
                        tpValid,
                    })
                );
            } catch (e) {
                Log.error(
                    [
                        'PATHING ERROR: runSearch() failed (invalid:endpoint)',
                        'From: ' + JSON.stringify(fromPos),
                        'To: ' + JSON.stringify(toPos),
                        'Error: ' + (e && e.message),
                        'Stack:',
                        e && e.stack,
                    ].join('\n')
                );
            }
        }
        return { path: [], incomplete: true, ops: 0, cost: 0 };
    }
    const opts = pfOpts || {};
    // Dynamic maxOps: scale roughly with squared linear distance but clamp.
    let dynOps;
    try {
        const linear = fromPos.getRangeTo(toPos);
        dynOps = 20 + linear * linear * 6; // gentle curve; 5 tiles ~ 170 ops, 20 tiles ~ 2440 (clamped)
    } catch (e) {
        Log.error(
            [
                'PATHING ERROR: runSearch() failed (range calc)',
                'From: ' + JSON.stringify(fromPos),
                'To: ' + JSON.stringify(toPos),
                'Error: ' + (e && e.message),
                'Stack:',
                e && e.stack,
            ].join('\n')
        );
        dynOps = 500; // fallback
    }
    if (dynOps > 2000) dynOps = 2000;
    if (dynOps < 150) dynOps = 150;
    const res = PathFinder.search(
        fromPos,
        { pos: toPos, range: range },
        {
            plainCost: opts.plainCost != null ? opts.plainCost : PLAIN_COST,
            swampCost: opts.swampCost != null ? opts.swampCost : SWAMP_COST,
            maxRooms: opts.maxRooms != null ? opts.maxRooms : 1,
            maxOps: opts.maxOps != null ? opts.maxOps : dynOps,
            flee: !!opts.flee,
            ignoreCreeps: !!opts.ignoreCreeps,
            roomCallback(roomName) {
                try {
                    return buildCostMatrix(roomName, opts);
                } catch (e) {
                    Log.error(
                        [
                            'PATHING ERROR: runSearch() failed (roomCallback)',
                            'Room: ' + roomName,
                            'Error: ' + (e && e.message),
                            'Stack:',
                            e && e.stack,
                        ].join('\n')
                    );
                    return null;
                }
            },
        }
    );
    return res;
}

// Coordinate guard (debug only): wrap global RoomPosition to trace invalid constructions outside this module.
// Enable by setting debug flag: pathing.coordGuard
if (
    !global.__coordGuard &&
    Debug.is &&
    Debug.is('pathing.coordGuard') &&
    typeof RoomPosition === 'function'
) {
    try {
        const OrigRP = RoomPosition;
        const Guarded = function (x, y, roomName, opts) {
            if (typeof opts !== 'undefined' && opts && opts.debug) {
                Log.info(`Guarded RoomPosition: (${x},${y},${roomName})`);
            }
            if (!(x >= 0 && y >= 0 && x < 50 && y < 50) || typeof roomName !== 'string') {
                try {
                    Log.error(
                        [
                            '[COORDGUARD] invalidCtor',
                            'Coords: x=' + x + ', y=' + y + ', room=' + roomName,
                            'Stack:',
                            new Error().stack.split('\n')[1],
                        ].join('\n')
                    );
                } catch (e) {
                    Log.error(
                        [
                            'PATHING ERROR: Guarded() failed',
                            'Coords: x=' + x + ', y=' + y + ', room=' + roomName,
                            'Error: ' + (e && e.message),
                            'Stack:',
                            e && e.stack,
                            `Error object: ${JSON.stringify(e)}`,
                        ].join('\n')
                    );
                }
                // Clamp to nearest valid tile (0..49) so engine does not throw; still logs origin.
                if (typeof x === 'number') x = Math.min(49, Math.max(0, x | 0));
                else x = 25;
                if (typeof y === 'number') y = Math.min(49, Math.max(0, y | 0));
                else y = 25;
                if (typeof roomName !== 'string') roomName = 'unknown';
            }
            return new OrigRP(x, y, roomName);
        };
        Guarded.prototype = OrigRP.prototype;
        global.RoomPosition = Guarded;
        global.__coordGuard = true;
        if (Debug.is('pathing.verbose')) console.log('[COORDGUARD] installed');
    } catch (e) {
        Log.error(
            [
                'PATHING ERROR: Guarded() failed during coordGuard install',
                'Error: ' + (e && e.message),
                'Stack:',
                e && e.stack,
            ].join('\n')
        );
    }
}

function get(fromPos, toPos, opts) {
    opts = opts || {};
    const range = opts.range || 1;
    const ttl = opts.ttl || DEFAULT_TTL;
    const key = makeKey(fromPos, toPos, range);
    if (!key) return [];
    const store = ensureStore();
    const rec = store[key];
    if (rec && rec.e > Game.time && rec.p && rec.p.length) {
        rec.t = Game.time; // touch for LRU
        if (Memory.stats) Memory.stats.pathingHits = (Memory.stats.pathingHits || 0) + 1;
        return rec.p;
    }
    if (Memory.stats) Memory.stats.pathingMisses = (Memory.stats.pathingMisses || 0) + 1;
    if (typeof PathFinder === 'undefined') return []; // test environment safeguard
    // Base path: ignore creeps so it's stable over time, prefer roads via roomCallback
    const basePf = opts.pf || {};
    if (basePf.ignoreCreeps == null) basePf.ignoreCreeps = true;
    const res = runSearch(fromPos, toPos, range, basePf);
    // Try to use Cache for path result storage and retrieval
    let ser = Cache.get('path:' + key);
    if (!ser) {
        ser = serializePath(res.path || []);
        Cache.set('path:' + key, ser, ttl);
    }
    store[key] = { p: ser, e: Game.time + ttl, t: Game.time };
    lruTrim(store);
    return ser;
}

function invalidate(key) {
    const store = ensureStore();
    if (key && store[key]) delete store[key];
}

function step(creep, target, opts) {
    // opts: { range, ttl, visualize, style }
    if (!creep || !target) return ERR_INVALID_TARGET;
    const range = (opts && opts.range) || 1;
    const tgtPos = target.pos || target;
    const distToGoal = creep.pos.getRangeTo(tgtPos);
    if (distToGoal <= range) return OK; // already there
    // FAST PATH: very short distances (<=3) – avoid full path machinery unless blocked.
    if (distToGoal <= 3) {
        const dir = creep.pos.getDirectionTo(tgtPos);
        if (dir) {
            const mv = creep.move(dir);
            if (mv === OK) return OK;
            // If immediate move failed (likely blocker), fall through to normal logic for bypass / blocking handling.
        }
    }
    const data = creep.memory._path || (creep.memory._path = {});
    let key = data.k;
    const tgtKey = Mapper.toPosKey(tgtPos);
    // If goal changed, drop
    if (!key || data.goal !== tgtKey) {
        key = makeKey(creep.pos, tgtPos, range);
        data.k = key;
        data.goal = tgtKey;
        data.i = 0;
        data.stuck = 0;
        data.last = Mapper.toPosKey(creep.pos);
        data.p = get(creep.pos, tgtPos, opts);
        data.created = Game.time;
    }
    // Recompute base path if exhausted or aged out (hard refresh)
    if (
        !data.p ||
        data.i >= data.p.length ||
        (REPATH_AFTER && Game.time - data.created >= REPATH_AFTER)
    ) {
        data.p = get(creep.pos, tgtPos, opts);
        data.i = 0;
        data.created = Game.time;
    }

    // If a bypass path exists and still valid, use it instead of base
    if (data.bypass && data.bypass.expires > Game.time) {
        if (!data.bypass.p || data.bypass.i >= data.bypass.p.length) {
            // finished bypass, drop it
            data.bypass = null;
        }
    }

    let activePath = data.bypass ? data.bypass : data;

    // Advance cursor ONLY if we actually arrived at the previously targeted step
    // We track the last intended step in activePath.ls (last step key). This prevents
    // artificial skipping (observed i=3 with no tile movement in debug logs).
    const curKey = Mapper.toPosKey(creep.pos);
    if (
        activePath.ls &&
        activePath.ls === curKey &&
        activePath.i < ((activePath.p && activePath.p.length) || 0)
    ) {
        activePath.i++;
        activePath.ls = null; // consumed
    }
    // Skip any pathological self-steps (serialized path entries equal to current position).
    // These can appear due to edge cases in path recomputation or goal proximity and cause
    // endless mv=OK + no movement loops inflating stuck counters.
    while (
        activePath.p &&
        activePath.i < activePath.p.length &&
        activePath.p[activePath.i] === curKey
    ) {
        activePath.i++;
    }

    let nextKey = activePath.p && activePath.p[activePath.i];
    if (!nextKey) {
        // No steps (empty path) — fallback to built-in moveTo pathing
        if (Memory.stats) Memory.stats.pathingFallbacks = (Memory.stats.pathingFallbacks || 0) + 1;
        return creep.moveTo(tgtPos, { reusePath: 5 });
    }
    let nextPos = deserializeStep(nextKey);
    if (!nextPos) return creep.moveTo(tgtPos);
    if (!isValidPosObject(nextPos)) {
        dbg(creep, 'invalid:nextStepDeser', { next: nextKey });
        // Recompute base path immediately
        data.p = get(creep.pos, tgtPos, opts);
        data.i = 0;
        data.created = Game.time;
        activePath = data.bypass ? data.bypass : data;
        nextKey = activePath.p && activePath.p[0];
        nextPos = nextKey && deserializeStep(nextKey);
        if (!nextPos || !isValidPosObject(nextPos)) {
            dbg(creep, 'invalid:repathFailed', { next: nextKey });
            return creep.moveTo(tgtPos, { reusePath: 0 });
        }
    }
    // SAFEGUARD: Path desync detection – a valid PathFinder path must have consecutive steps (range 1).
    // If we ever see a stored next step farther than 1 tile away, invalidate & recompute to avoid infinite stuck.
    if (creep.pos.getRangeTo(nextPos) > 1) {
        if (Memory.stats) Memory.stats.pathingDesync = (Memory.stats.pathingDesync || 0) + 1;
        dbg(creep, 'desync:pathGap', {
            cur: Mapper.toPosKey(creep.pos),
            next: nextKey,
            i: activePath.i,
            len: (activePath.p && activePath.p.length) || 0,
        });
        // Rebuild path from current position; reset cursor.
        data.p = get(creep.pos, tgtPos, opts);
        data.i = 0;
        data.created = Game.time;
        activePath = data.bypass ? data.bypass : data; // ensure reference consistency
        nextKey = activePath.p && activePath.p[0];
        nextPos = nextKey && deserializeStep(nextKey);
        if (!nextPos || creep.pos.getRangeTo(nextPos) > 1) {
            // Fallback if still invalid
            return creep.moveTo(tgtPos, { reusePath: 0 });
        }
    }
    // Store for debug (coarse) every 5 ticks OR every tick if in stuck escalation
    if (Debug.is('pathing.verbose')) {
        if (Game.time % 5 === 0 || (data.stuck && data.stuck > 0)) {
            try {
                console.log(
                    '[PATHDBG2]',
                    creep.name,
                    'i=' + activePath.i,
                    'cur=' + Mapper.toPosKey(creep.pos),
                    'next=' + nextKey,
                    'goal=' + data.goal
                );
            } catch (e) {
                Log.error(
                    [
                        'PATHING ERROR: step() failed during ghostBlock mitigation diversion',
                        'Creep: ' + (creep && creep.name),
                        'Error: ' + (e && e.message),
                        'Stack:',
                        e && e.stack,
                    ].join('\n')
                );
            }
        }
    }
    // Ghost-block / phantom progress detector: if we set an intended step (activePath.ls) but
    // haven't actually arrived after several ticks (cursor not advancing, tile not flagged blocked),
    // treat as a block then reset path. This replaces prior per-tick noAdvance logic which reset too aggressively.
    if (activePath.ls && activePath.ls !== curKey) {
        activePath._lsAge = (activePath._lsAge || 0) + 1;
        if (activePath._lsAge === 3) {
            activePath.blocked = (activePath.blocked || 0) + 1;
            dbg(creep, 'ghostBlocked:promote', { age: activePath._lsAge, i: activePath.i });
        } else if (activePath._lsAge === 6) {
            invalidate(key);
            data.k = null;
            data.bypass = null;
            dbg(creep, 'ghostBlocked:hardReset', { age: activePath._lsAge, i: activePath.i });
        }
    } else {
        activePath._lsAge = 0;
    }
    // Determine direction toward next tile
    // Detect hard block (another creep sitting on next tile)
    let blocked = false;
    if (creep.room && creep.room.lookForAt) {
        const creepsAt = creep.room.lookForAt(LOOK_CREEPS, nextPos.x, nextPos.y) || [];
        if (creepsAt.length && !(creepsAt.length === 1 && creepsAt[0].name === creep.name)) {
            blocked = true;
        }
        // Static obstacle detection: if a formerly empty / construction-site tile now has a
        // non-walkable structure (e.g., extension just completed), treat as a hard block and
        // trigger an early base path recompute instead of accumulating ghostBlock counts.
        if (!blocked) {
            try {
                const structs = creep.room.lookForAt(LOOK_STRUCTURES, nextPos.x, nextPos.y) || [];
                // Construction sites are ALWAYS walkable; check separately only if we later want heuristics
                const sites =
                    creep.room.lookForAt(LOOK_CONSTRUCTION_SITES, nextPos.x, nextPos.y) || [];
                // If only sites (no non-walkable structures) → do nothing (walkable)
                let hard = false;
                for (let i = 0; i < structs.length; i++) {
                    if (!isWalkableStructure(structs[i])) {
                        hard = true;
                        break;
                    }
                }
                if (hard) {
                    blocked = true;
                    activePath.blocked = (activePath.blocked || 0) + 1;
                    dbg(creep, 'blocked:structure', {
                        i: activePath.i,
                        step: nextKey,
                        t: structs.map((s) => s.structureType).join(','),
                    });
                    // Invalidate & recompute base path immediately so we route around new build
                    if (data === activePath) {
                        invalidate(key);
                        data.k = null; // force rebuild next tick
                    } else {
                        data.bypass = null; // drop bypass; base will rebuild next tick
                    }
                } else if (
                    sites.length &&
                    Debug.is &&
                    Debug.is('pathing.verbose') &&
                    activePath.i <= 4
                ) {
                    // Optional debug line to show we intentionally allowed stepping onto a site
                    dbg(creep, 'site:walkable', {
                        step: nextKey,
                        kinds: sites.map((s) => s.structureType).join(','),
                    });
                }
            } catch (e) {
                Log.error(
                    [
                        'PATHING ERROR: step() failed during structure check',
                        'Creep: ' + (creep && creep.name),
                        'Pos: ' + JSON.stringify(nextPos),
                        'Error: ' + (e && e.message),
                        'Stack:',
                        e && e.stack,
                    ].join('\n')
                );
            }
        }
    }
    // Lane reservation: if tile not physically blocked, attempt to reserve; on conflict treat as block.
    if (!blocked) {
        const ok = reserveStep(creep, nextKey);
        if (!ok) {
            blocked = true;
            activePath.blocked = (activePath.blocked || 0) + 1;
            dbg(creep, 'reserve:conflict', { i: activePath.i, step: nextKey });
        } else {
            activePath._reserved = nextKey;
        }
    }
    // Collect rich classification BEFORE attempting movement (intent phase)
    const nextTileInfo = classifyNextTile(creep, nextPos);
    const intentCause = computeCause(
        nextTileInfo,
        blocked &&
            activePath._reserved !== nextKey &&
            nextTileInfo.occNames.length === 0 &&
            !nextTileInfo.unwalkable.length,
        undefined,
        creep.fatigue > 0,
        false
    );
    dbgCause(creep, 'intent', {
        cur: Mapper.toPosKey(creep.pos),
        next: nextKey,
        goal: data.goal,
        i: activePath.i,
        type: activePath !== data ? 'BYPASS' : 'BASE',
        blocked: blocked ? 1 : 0,
        cause: intentCause,
        occ: nextTileInfo.occNames.join(',') || undefined,
        occRoles: nextTileInfo.occRoles.join(',') || undefined,
        structs: nextTileInfo.structs.join(',') || undefined,
        unwalk: nextTileInfo.unwalkable.join(',') || undefined,
        hasSite: nextTileInfo.hasSite ? 1 : 0,
        reserved: activePath._reserved === nextKey ? 1 : 0,
    });
    if (blocked) {
        // Increment a per-path block counter; quick bypass after 1-2 ticks
        activePath.blocked = (activePath.blocked || 0) + 1;
        // Attempt a direct tile swap with the single blocking creep (lets us move onto construction sites occupied by our own creeps)
        if (ENABLE_CREEP_SWAP && creep.room) {
            try {
                const others = creep.room.lookForAt(LOOK_CREEPS, nextPos.x, nextPos.y) || [];
                if (others.length === 1 && others[0].name !== creep.name) {
                    const other = others[0];
                    // Only attempt if both are ours and other not spawning/moving due to fatigue
                    if (other.my && other.fatigue === 0 && creep.fatigue === 0) {
                        // If the blocker is building on a construction site or harvesting/mining, we still try.
                        const dirForOther = other.pos.getDirectionTo(creep.pos);
                        const dirForSelf = creep.pos.getDirectionTo(other.pos);
                        if (dirForOther && dirForSelf) {
                            const movedOther = other.move(dirForOther);
                            if (movedOther === OK) {
                                const movedSelf = creep.move(dirForSelf);
                                if (movedSelf === OK) {
                                    if (Memory.stats)
                                        Memory.stats.pathingSwaps =
                                            (Memory.stats.pathingSwaps || 0) + 1;
                                    dbg(creep, 'swap:creep', {
                                        other: other.name,
                                        i: activePath.i,
                                    });
                                    // Treat as progress: mark intended step consumed
                                    activePath.ls = nextKey; // advance next tick
                                    return OK;
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                Log.error(
                    [
                        'PATHING ERROR: step() failed during creep swap',
                        'Creep: ' + (creep && creep.name),
                        'Pos: ' + JSON.stringify(nextPos),
                        'Error: ' + (e && e.message),
                        'Stack:',
                        e && e.stack,
                    ].join('\n')
                );
            }
        }
        // DEBUG: log first few block events when enabled
        if (Debug.is('pathing.verbose') && activePath.blocked <= 4) {
            let occNames = [];
            try {
                const occ = creep.room.lookForAt(LOOK_CREEPS, nextPos.x, nextPos.y) || [];
                occNames = occ.filter((c) => c.name !== creep.name).map((c) => c.name);
            } catch (e) {
                Log.error(
                    [
                        'PATHING ERROR: step() failed during spawn-ring sidestep',
                        'Creep: ' + (creep && creep.name),
                        'Error: ' + (e && e.message),
                        'Stack:',
                        e && e.stack,
                    ].join('\n')
                );
            }
            dbg(creep, 'blocked:creep', {
                i: activePath.i,
                blk: activePath.blocked,
                stuck: data.stuck || 0,
                goal: data.goal,
                occ: occNames.join(','),
            });
            // Remember most recent blockers for later stuck classification
            data._lastBlockers = occNames;
        }
        // Spawn-ring sidestep heuristic: if we're at the very start of a path right beside a spawn
        // and immediately blocked, try a one-off lateral move to free the tile for others.
        if (activePath.i === 0 && activePath.blocked === 1 && Debug.is('pathing.scatter')) {
            try {
                const nearSpawn = creep.pos.findInRange(FIND_MY_SPAWNS, 1).length > 0;
                if (nearSpawn) {
                    const dirs = [1, 2, 3, 4, 5, 6, 7, 8];
                    // simple shuffle (Fisher-Yates lite)
                    for (let i = dirs.length - 1; i > 0; i--) {
                        const j = (Math.random() * (i + 1)) | 0;
                        const tmp = dirs[i];
                        dirs[i] = dirs[j];
                        dirs[j] = tmp;
                    }
                    for (let d = 0; d < dirs.length; d++) {
                        const dir = dirs[d];
                        const dx = [-1, 0, 1, -1, 1, -1, 0, 1][dir - 1];
                        const dy = [-1, -1, -1, 0, 0, 1, 1, 1][dir - 1];
                        const x = creep.pos.x + dx;
                        const y = creep.pos.y + dy;
                        if (x < 1 || y < 1 || x > 48 || y > 48) continue;
                        const terrain = creep.room.getTerrain().get(x, y);
                        if (terrain === TERRAIN_MASK_WALL) continue;
                        const occupied = creep.room.lookForAt(LOOK_CREEPS, x, y).length > 0;
                        if (occupied) continue;
                        const mvSide = creep.move(dir);
                        if (mvSide === OK) {
                            dbg(creep, 'sidestep:spawnRing', { dir });
                            return OK;
                        }
                    }
                }
            } catch (e) {
                Log.error(`Error in micro sidestep: ${e && e.message ? e.message : e}`);
                if (Debug.is('pathing.verbose'))
                    Log.error(`Micro sidestep error details: ${JSON.stringify(e)}`);
            }
        }
        // Micro sidestep: try a single-tile lateral move (retain base path cursor) BEFORE heavier logic.
        if (
            ENABLE_MICRO_SIDESTEP &&
            activePath.blocked >= 1 && // allow repeated attempts, not only first block
            activePath.i <= 6 && // limit to early path segment to avoid late-path churn
            creep.room &&
            typeof creep.room.getTerrain === 'function'
        ) {
            try {
                const terrain = creep.room.getTerrain();
                const curRange = creep.pos.getRangeTo(tgtPos);
                // Collect neighbor candidates
                /** @type {{dir:number,isRoad:number,better:number}[]} */
                const candidates = [];
                for (let dir = 1; dir <= 8; dir++) {
                    const dx = [-1, 0, 1, -1, 1, -1, 0, 1][dir - 1];
                    const dy = [-1, -1, -1, 0, 0, 1, 1, 1][dir - 1];
                    const x = creep.pos.x + dx;
                    const y = creep.pos.y + dy;
                    if (x < 1 || y < 1 || x > 48 || y > 48) continue;
                    if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;
                    const occupied = creep.room.lookForAt(LOOK_CREEPS, x, y).length > 0;
                    if (occupied) continue;
                    const structs = creep.room.lookForAt(LOOK_STRUCTURES, x, y) || [];
                    const sites = creep.room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y) || [];
                    const roadish =
                        structs.some((s) => s.structureType === STRUCTURE_ROAD) ||
                        sites.some((c) => c.structureType === STRUCTURE_ROAD);
                    const newPos = safePos(x, y, creep.room.name);
                    if (!newPos) {
                        dbg(creep, 'invalidCoord:micro', { x, y });
                        continue;
                    }
                    const newRange = newPos.getRangeTo(tgtPos);
                    if (newRange - curRange > MICRO_SIDESTEP_MAX_RANGE_INCREASE) continue; // don't worsen path
                    candidates.push({
                        dir,
                        isRoad: roadish ? 1 : 0,
                        better: newRange <= curRange ? 1 : 0,
                    });
                }
                if (candidates.length) {
                    // Prioritize: road/roadSite, then non-worsening (<= curRange), then random tie-break
                    candidates.sort(
                        (a, b) => b.isRoad - a.isRoad || b.better - a.better || Math.random() - 0.5
                    );
                    for (const c of candidates) {
                        if (creep.move(c.dir) === OK) {
                            if (Memory.stats)
                                Memory.stats.pathingMicroSidestep =
                                    (Memory.stats.pathingMicroSidestep || 0) + 1;
                            dbg(creep, 'sidestep:micro', {
                                dir: c.dir,
                                better: c.better,
                                road: c.isRoad,
                            });
                            return OK; // successful lateral move; keep base path
                        }
                    }
                }
            } catch (e) {
                Log.error(
                    [
                        'PATHING ERROR: step() failed during micro sidestep',
                        'Creep: ' + (creep && creep.name),
                        'Error: ' + (e && e.message),
                        'Stack:',
                        e && e.stack,
                    ].join('\n')
                );
            }
        }

        // Determine if we should fast-bypass immediately (road corridor heuristic)
        let fastBypass = false;
        if (
            FAST_BYPASS_ON_ROAD_CORRIDOR &&
            activePath.blocked === 1 &&
            creep.room &&
            creep.room.lookForAt
        ) {
            try {
                const hereStructs = creep.room.lookForAt(LOOK_STRUCTURES, creep.pos.x, creep.pos.y);
                const hereSites = creep.room.lookForAt(
                    LOOK_CONSTRUCTION_SITES,
                    creep.pos.x,
                    creep.pos.y
                );
                const nextStructs = creep.room.lookForAt(LOOK_STRUCTURES, nextPos.x, nextPos.y);
                const nextSites = creep.room.lookForAt(
                    LOOK_CONSTRUCTION_SITES,
                    nextPos.x,
                    nextPos.y
                );
                const hereRoad =
                    hereStructs.some((s) => s.structureType === STRUCTURE_ROAD) ||
                    hereSites.some((s) => s.structureType === STRUCTURE_ROAD);
                const nextRoad =
                    nextStructs.some((s) => s.structureType === STRUCTURE_ROAD) ||
                    nextSites.some((s) => s.structureType === STRUCTURE_ROAD);
                fastBypass = hereRoad && nextRoad;
            } catch (e) {
                Log.error(
                    [
                        'PATHING ERROR: step() failed during fast bypass check',
                        'Creep: ' + (creep && creep.name),
                        'Error: ' + (e && e.message),
                        'Stack:',
                        e && e.stack,
                    ].join('\n')
                );
                fastBypass = false;
            }
        }

        // Treat reservation conflicts (ghostBlock style) as eligible for fast bypass to break symmetry sooner.
        // Escalate if blocked creep is a friendly builder sitting on a construction site (high stickiness)
        if (!fastBypass && !needBypass) {
            try {
                if (creep.room) {
                    const siteHere =
                        creep.room.lookForAt(LOOK_CONSTRUCTION_SITES, nextPos.x, nextPos.y) || [];
                    if (siteHere.length) {
                        const blockCreeps =
                            creep.room.lookForAt(LOOK_CREEPS, nextPos.x, nextPos.y) || [];
                        if (blockCreeps.some((c) => c.my && c.memory && c.memory.building)) {
                            activePath.blocked = Math.max(
                                activePath.blocked || 1,
                                BLOCK_BYPASS_THRESHOLD
                            );
                        }
                    }
                }
            } catch (e) {
                Log.error(
                    [
                        'PATHING ERROR: step() failed during builder block escalation',
                        'Creep: ' + (creep && creep.name),
                        'Error: ' + (e && e.message),
                        'Stack:',
                        e && e.stack,
                    ].join('\n')
                );
            }
        }
        const needBypass = fastBypass || activePath.blocked >= BLOCK_BYPASS_THRESHOLD;
        if (needBypass) {
            // Force bypass path ignoring current occupant layout
            if (typeof PathFinder !== 'undefined') {
                const byRes = runSearch(creep.pos, tgtPos, range, {
                    ignoreCreeps: false,
                    maxRooms: 1,
                    maxOps: 2500,
                });
                const bPath = serializePath(byRes.path || []);
                if (bPath && bPath.length) {
                    data.bypass = { p: bPath, i: 0, expires: Game.time + BYPASS_TTL };
                    activePath = data.bypass;
                    nextKey = activePath.p[0];
                    nextPos = deserializeStep(nextKey);
                    dbg(creep, fastBypass ? 'bypass:fastCorridor' : 'bypass:blockThreshold', {
                        len: bPath.length,
                        blk: activePath.blocked || 1,
                    });
                }
            }
            activePath.blocked = 0;
        } else {
            // Early-lane scatter: if we're still in first 3 steps of a path and blocked, try side-exit before generic moveTo
            if (activePath.i <= 3) {
                try {
                    const dirs = [1, 2, 3, 4, 5, 6, 7, 8];
                    for (let i = dirs.length - 1; i > 0; i--) {
                        const j = (Math.random() * (i + 1)) | 0;
                        const tmp = dirs[i];
                        dirs[i] = dirs[j];
                        dirs[j] = tmp;
                    }
                    for (let k = 0; k < dirs.length; k++) {
                        const dir = dirs[k];
                        const dx = [-1, 0, 1, -1, 1, -1, 0, 1][dir - 1];
                        const dy = [-1, -1, -1, 0, 0, 1, 1, 1][dir - 1];
                        const x = creep.pos.x + dx,
                            y = creep.pos.y + dy;
                        if (x < 1 || y < 1 || x > 48 || y > 48) continue;
                        const t = creep.room.getTerrain().get(x, y);
                        if (t === TERRAIN_MASK_WALL) continue;
                        const occupied = creep.room.lookForAt(LOOK_CREEPS, x, y).length > 0;
                        if (occupied) continue;
                        // Avoid moving deeper into spawn tile congestion: prefer tiles with range > 1 to spawn
                        const nearSpawn = creep.pos.findInRange(FIND_MY_SPAWNS, 1)[0];
                        if (nearSpawn) {
                            const testPos = safePos(x, y, creep.room.name);
                            if (!testPos) {
                                dbg(creep, 'invalidCoord:scatter', { x, y });
                                continue;
                            }
                            if (testPos.getRangeTo(nearSpawn) === 0) continue;
                        }

                        if (creep.move(dir) === OK) {
                            dbg(creep, 'scatter:earlyLane', { dir, i: activePath.i });
                            return OK;
                        }
                    }
                } catch (e) {
                    Log.error(
                        [
                            'PATHING ERROR: step() failed during early-lane scatter',
                            'Creep: ' + (creep && creep.name),
                            'Error: ' + (e && e.message),
                            'Stack:',
                            e && e.stack,
                        ].join('\n')
                    );
                }
            }
            // Attempt a built-in moveTo this tick to allow potential creep swaps
            return creep.moveTo(nextPos, { reusePath: 0 });
        }
    } else if (activePath.blocked) {
        activePath.blocked = 0;
    }

    const dir = creep.pos.getDirectionTo(nextPos);
    let mv;
    if (!dir) {
        // direction 0 (same position) — advance and exit
        activePath.i++;
        mv = OK;
    } else {
        mv = creep.move(dir);
        if (mv < 0 && mv !== ERR_TIRED) {
            // Fallback to moveTo if low-level move failed (blocked by edge case / invalid dir)
            if (Memory.stats)
                Memory.stats.pathingFallbacks = (Memory.stats.pathingFallbacks || 0) + 1;
            mv = creep.moveTo(nextPos, { reusePath: 0 });
        }
    }
    // Post-intent result classification
    const lsMismatch = activePath.ls && activePath.ls !== Mapper.toPosKey(creep.pos);
    const resultCause = computeCause(nextTileInfo, false, mv, creep.fatigue > 0, lsMismatch);
    dbgCause(creep, 'result', {
        mv,
        cause: resultCause,
        stuck: data.stuck || 0,
        blk: activePath.blocked || 0,
        ls: activePath.ls || '-',
    });
    if (mv === OK) {
        // Mark intended step; actual tile update occurs next tick
        activePath.ls = nextKey;
        // (Optional) strengthen reservation for next tick diagnostics
        if (activePath._reserved === nextKey && global.__laneRes) {
            global.__laneRes.map[nextKey] = creep.name; // re-affirm
        }
        if (data.bypass && creep.room) {
            const rs = creep.room.lookForAt(LOOK_STRUCTURES, creep.pos) || [];
            const cs = creep.room.lookForAt(LOOK_CONSTRUCTION_SITES, creep.pos) || [];
            const onRoad =
                rs.some((s) => s.structureType === STRUCTURE_ROAD) ||
                cs.some((c) => c.structureType === STRUCTURE_ROAD);
            if (onRoad) data.bypass = null;
        }
    } else if (mv === ERR_TIRED) {
        // do nothing (fatigue not considered stuck)
    } else if (mv < 0) {
        // path likely invalid
        invalidate(key);
        data.k = null;
    }
    // Stuck detection (no movement & no fatigue)
    const posKey = Mapper.toPosKey(creep.pos);
    if (data.last === posKey && mv !== ERR_TIRED) {
        data.stuck = (data.stuck || 0) + 1;
        // Classify reason for this tick's lack of progress
        let reason = 'unknown';
        if (activePath.blocked) reason = 'blockedTile';
        else if (mv === OK) {
            // mv intent accepted but position did not change. Likely a ghost block (simultaneous move conflict)
            // OR our pre-move occupancy check missed a creep that also failed to vacate. Reclassify as a block so
            // downstream logic (early bypass / repath) triggers sooner instead of accumulating huge stuck counts.
            if (activePath.ls && activePath.ls !== curKey) {
                activePath.blocked = (activePath.blocked || 0) + 1;
                reason = 'ghostBlock';
            } else {
                reason = 'noAdvanceOnCursor';
            }
        } else if (mv === ERR_NO_BODYPART) reason = 'noMoveParts';
        else if (mv === ERR_BUSY) reason = 'busy';
        else if (mv === ERR_NOT_FOUND) reason = 'moveTargetMissing';
        else if (mv === ERR_INVALID_ARGS) reason = 'badArgs';
        else if (mv === ERR_NO_PATH) reason = 'noPathEngine';
        else if (mv === ERR_NOT_OWNER) reason = 'notOwner';
        data._lastStuckReason = reason;
        // GhostBlock mitigation BEFORE threshold: attempt an alternate lateral diversion (single tile)
        // to break symmetry if we are still in early path segment. Only when not yet at threshold.
        if (
            reason === 'ghostBlock' &&
            data.stuck >= 2 &&
            data.stuck < STUCK_THRESHOLD &&
            activePath.i <= 6 &&
            creep.fatigue === 0 &&
            creep.room &&
            typeof creep.room.getTerrain === 'function'
        ) {
            try {
                const terrain = creep.room.getTerrain();
                const curRange = creep.pos.getRangeTo(tgtPos);
                const alts = [];
                for (let dir = 1; dir <= 8; dir++) {
                    const dx = [-1, 0, 1, -1, 1, -1, 0, 1][dir - 1];
                    const dy = [-1, -1, -1, 0, 0, 1, 1, 1][dir - 1];
                    const x = creep.pos.x + dx;
                    const y = creep.pos.y + dy;
                    if (x < 1 || y < 1 || x > 48 || y > 48) continue;
                    if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;
                    if (creep.room.lookForAt(LOOK_CREEPS, x, y).length) continue;
                    const pos = safePos(x, y, creep.room.name);
                    if (!pos) {
                        dbg(creep, 'invalidCoord:divert', { x, y });
                        continue;
                    }
                    const r = pos.getRangeTo(tgtPos);
                    // Allow same or better range; prefer better
                    if (r <= curRange) {
                        // Softly avoid original planned next tile (we already failed to enter)
                        const key = Mapper.toPosKey(pos);
                        if (key === activePath.p[activePath.i]) continue;
                        alts.push({ dir, better: r < curRange ? 1 : 0, range: r });
                    }
                }
                if (alts.length) {
                    alts.sort(
                        (a, b) => b.better - a.better || a.range - b.range || Math.random() - 0.5
                    );
                    for (const a of alts) {
                        if (creep.move(a.dir) === OK) {
                            // Reset intended step so we re-evaluate path next tick from new tile
                            activePath.ls = null;
                            if (Memory.stats)
                                Memory.stats.pathingGhostDiversions =
                                    (Memory.stats.pathingGhostDiversions || 0) + 1;
                            dbg(creep, 'divert:ghostBlock', { dir: a.dir, better: a.better });
                            break; // attempt only once per tick
                        }
                    }
                }
            } catch (e) {
                Log.error(`Error in stuck increment: ${e && e.message ? e.message : e}`);
                if (Debug.is('pathing.verbose'))
                    Log.error(`Stuck increment error details: ${JSON.stringify(e)}`);
            }
        }
        if (Debug.is('pathing.verbose') && data.stuck <= STUCK_THRESHOLD) {
            dbg(creep, 'stuck:increment', {
                stuck: data.stuck,
                reason: reason,
                mv: mv,
                blk: activePath.blocked || 0,
                occ: (data._lastBlockers && data._lastBlockers.join(',')) || '',
            });
        }
    } else {
        data.stuck = 0;
        data.last = posKey;
    }
    // Emit ultra-detailed snapshot if requested (after movement + stuck evaluation)
    dbgDetail(creep, data, activePath, { nextPos });
    if (data.stuck >= STUCK_THRESHOLD) {
        // Build a bypass path around current dynamic obstacles (do not cache globally)
        if (Memory.stats) Memory.stats.pathingStuck = (Memory.stats.pathingStuck || 0) + 1;
        dbg(creep, 'stuck:thresholdReached', {
            stuck: data.stuck,
            i: activePath.i,
            blk: activePath.blocked || 0,
            reason: data._lastStuckReason,
            occ: (data._lastBlockers && data._lastBlockers.join(',')) || '',
            baseLen: (data.p && data.p.length) || 0,
            bypass: !!data.bypass,
        });
        // Early-lane adaptive re-path: for first few steps (spawn egress / road site cluster),
        // attempt a fresh short path with ignoreCreeps=false BEFORE creating a longer bypass.
        if (
            activePath === data &&
            activePath.i <= 3 &&
            Game.cpu &&
            Game.cpu.bucket >= MIN_BUCKET_EARLY_REPATH
        ) {
            // Cooldown guard: avoid spamming early repath every tick.
            if (
                !data._lastEarlyRepath ||
                Game.time - data._lastEarlyRepath >= EARLY_REPATH_COOLDOWN
            ) {
                try {
                    const shortRes = runSearch(creep.pos, tgtPos, range, {
                        ignoreCreeps: false,
                        maxRooms: 1,
                        maxOps: 1500,
                        plainCost: PLAIN_COST,
                        swampCost: SWAMP_COST,
                    });
                    const shortSer = serializePath(shortRes.path || []);
                    if (shortSer && shortSer.length) {
                        data.p = shortSer; // replace base path (not cached separately; get() already cached original key earlier)
                        data.i = 0;
                        data.created = Game.time; // reset age
                        data.stuck = 0; // give it a chance before bypass
                        data._lastEarlyRepath = Game.time;
                        dbg(creep, 'earlyRepath:shortRecalc', {
                            len: shortSer.length,
                            i: activePath.i,
                        });
                        // Retry stepping next tick after recalculation
                        return OK;
                    }
                } catch (e) {
                    Log.error(
                        [
                            'PATHING ERROR: step() failed during early-lane adaptive repath',
                            'Creep: ' + (creep && creep.name),
                            'Error: ' + (e && e.message),
                            'Stack:',
                            e && e.stack,
                        ].join('\n')
                    );
                }
            }
        }
        if (
            typeof PathFinder !== 'undefined' &&
            (!Game.cpu || Game.cpu.bucket >= MIN_BUCKET_BYPASS)
        ) {
            const byRes = runSearch(creep.pos, tgtPos, range, {
                ignoreCreeps: false,
                maxRooms: 1,
                plainCost: 2,
                swampCost: 10,
                maxOps: 3000,
            });
            const bPath = serializePath(byRes.path || []);
            if (bPath && bPath.length) {
                data.bypass = { p: bPath, i: 0, expires: Game.time + BYPASS_TTL };
                data.stuck = 0; // reset stuck once bypass created
                if (Memory.stats)
                    Memory.stats.pathingBypass = (Memory.stats.pathingBypass || 0) + 1;
                dbg(creep, 'bypass:fromStuck', { len: bPath.length, i: activePath.i });
                // Immediately attempt first step of bypass next tick
            } else {
                // As fallback, invalidate base path and allow full recompute
                invalidate(key);
                data.k = null;
            }
        } else if (typeof PathFinder !== 'undefined') {
            // CPU bucket too low for a full bypass. Attempt a lighter emergency recovery so we do not
            // accumulate hundreds of stuck ticks doing nothing.
            if (!data._lastLowBucketRecover || Game.time - data._lastLowBucketRecover >= 5) {
                data._lastLowBucketRecover = Game.time;
                try {
                    // Quick local repath with very small maxOps ignoring creeps=false to squeeze through congestion.
                    const quick = runSearch(creep.pos, tgtPos, range, {
                        ignoreCreeps: false,
                        maxRooms: 1,
                        maxOps: 800,
                        plainCost: PLAIN_COST,
                        swampCost: SWAMP_COST,
                    });
                    const qSer = serializePath(quick.path || []);
                    if (qSer && qSer.length) {
                        data.p = qSer;
                        data.i = 0;
                        data.created = Game.time;
                        data.stuck = 0; // give it a chance
                        dbg(creep, 'recover:lowBucketQuickPath', { len: qSer.length });
                        return OK;
                    }
                } catch (e) {
                    Log.error(
                        [
                            'PATHING ERROR: step() failed during ghostBlock diversion',
                            'Creep: ' + (creep && creep.name),
                            'Error: ' + (e && e.message),
                            'Stack:',
                            e && e.stack,
                        ].join('\n')
                    );
                }
                // As an ultimate fallback try a single random sidestep (cheap) if still totally blocked.
                try {
                    const dirs = [1, 2, 3, 4, 5, 6, 7, 8];
                    for (let i = 0; i < dirs.length; i++) {
                        const dir = dirs[(Math.random() * dirs.length) | 0];
                        const dx = [-1, 0, 1, -1, 1, -1, 0, 1][dir - 1];
                        const dy = [-1, -1, -1, 0, 0, 1, 1, 1][dir - 1];
                        const x = creep.pos.x + dx,
                            y = creep.pos.y + dy;
                        if (x < 1 || y < 1 || x > 48 || y > 48) continue;
                        if (creep.room.getTerrain().get(x, y) === TERRAIN_MASK_WALL) continue;
                        if (creep.room.lookForAt(LOOK_CREEPS, x, y).length) continue;
                        if (creep.move(dir) === OK) {
                            dbg(creep, 'recover:lowBucketSidestep', { dir });
                            break;
                        }
                    }
                } catch (e) {
                    Log.error(
                        [
                            'PATHING ERROR: step() failed during low bucket sidestep',
                            'Creep: ' + (creep && creep.name),
                            'Error: ' + (e && e.message),
                            'Stack:',
                            e && e.stack,
                        ].join('\n')
                    );
                }
            }
        }
    }
    // Optional visualize current segment (lightweight single line)
    if ((opts && opts.visualize) || Debug.is('pathing.visual')) {
        if (nextPos && creep.room && creep.room.visual) {
            try {
                const style = (opts && opts.style) || {
                    stroke: '#666',
                    opacity: 0.3,
                    lineStyle: 'dashed',
                };
                creep.room.visual.line(creep.pos, nextPos, style);
            } catch (e) {
                Log.error(
                    [
                        'PATHING ERROR: step() failed during path visualization (final segment)',
                        'Creep: ' + (creep && creep.name),
                        'Error: ' + (e && e.message),
                        'Stack:',
                        e && e.stack,
                    ].join('\n')
                );
            }
        }
    }

    // Rejoin heuristic: if on a bypass and adjacent to an upcoming base path tile, drop bypass early
    if (REJOIN_WHEN_ADJACENT_TO_BASE && data.bypass && data.p && Array.isArray(data.p)) {
        try {
            // Check next few base steps (limit to 5 for CPU safety)
            for (let j = data.i; j < data.p.length && j < data.i + 5; j++) {
                const bKey = data.p[j];
                const bPos = deserializeStep(bKey);
                if (!bPos) continue;
                if (creep.pos.getRangeTo(bPos) <= 1) {
                    data.bypass = null; // snap back
                    if (Memory.stats)
                        Memory.stats.pathingBypassRejoin =
                            (Memory.stats.pathingBypassRejoin || 0) + 1;
                    break;
                }
            }
        } catch (e) {
            Log.error(
                [
                    'PATHING ERROR: step() failed during bypass rejoin heuristic',
                    'Creep: ' + (creep && creep.name),
                    'Error: ' + (e && e.message),
                    'Stack:',
                    e && e.stack,
                ].join('\n')
            );
        }
    }
    return mv;
}

module.exports = { get, step, invalidate };
