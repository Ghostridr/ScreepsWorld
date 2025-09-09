/* eslint-env screeps */
// Structured logger for Screeps (CommonJS). Wraps console.* with tags (no tick timestamp).
// Usage: const Log = require('util.logger'); Log.info('hello'); Log.warn('issue'); Log.error('bad');
// Extras: Log.withTag('spawner').info('queued'); Log.every(20, () => 'heartbeat'); Log.once('key','msg')

const Log = module.exports;
let COLORS;
try {
    COLORS = require('config.colors');
} catch (e) {
    if (Log.error) Log.error('Error loading config.colors', e && e.stack ? e.stack : e);
    COLORS = null;
}

// Friendly tag aliases for console readability (emoji-only)
var TAG_ALIASES = {
    build: '🧱',
    builder: '🏗️',
    cleanup: '🗑️',
    container: '🗃️',
    containers: '🗃️',
    controller: '🎮',
    dashboard: '📊',
    debug: '🐞',
    error: '❌',
    ext: '🔌',
    extension: '🔌',
    extensions: '🔌',
    factory: '🏭',
    harvester: '🌾',
    haul: '🚚',
    hauler: '📦',
    heal: '❤️',
    healer: '❤️',
    heartbeat: '❤️',
    lab: '⚗️',
    links: '🔗',
    main: '🏠',
    market: '🏪',
    memory: '🧠',
    miner: '⛏️',
    nuker: '☢️',
    observer: '🔭',
    path: '🧭',
    pathing: '🧭',
    power_spawn: '⚡',
    powerspawn: '⚡',
    queue: '📋',
    rampart: '🛡️',
    repair: '🔨',
    road: '🛣️',
    roads: '🛣️',
    source: '🔋',
    sources: '🔋',
    spawn: '🍼',
    spawner: '🍼',
    stats: '📊',
    storage: '📦',
    terminal: '📨',
    tower: '🗼',
    upgrader: '🔨',
    wall: '🧱',
    walls: '🧱',
    warn: '⚠️',
    warning: '⚠️',
};
function displayTag(tag) {
    if (!tag) return '';
    var key = String(tag).toLowerCase();
    return TAG_ALIASES[key] || tag;
}
function fmt(tag, msg, level) {
    const t = displayTag(tag);
    const prefix = t ? '[' + t + '] ' : '';
    const marker =
        (COLORS && COLORS.logging && COLORS.logging.prefix && COLORS.logging.prefix[level]) || '';
    return (marker ? marker + ' ' : '') + prefix + msg;
}

// Log level gating (Memory-backed)
// Levels: error(0) < warn(1) < info(2) < debug(3) < trace(4)
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3, trace: 4, log: 2 };
function getLevel() {
    const root = Memory.log || Memory.__log || {};
    const lvl = root.level != null ? root.level : Memory.__logLevel; // legacy fallback
    if (typeof lvl === 'number') return lvl;
    const key = (lvl || 'info').toString().toLowerCase();
    return LEVELS[key] != null ? LEVELS[key] : LEVELS.info;
}
function enabled(level) {
    const want = LEVELS[level] != null ? LEVELS[level] : LEVELS.info;
    return want <= getLevel();
}
Log.setLevel = function (level) {
    const n = typeof level === 'number' ? level : LEVELS[String(level).toLowerCase()];
    if (typeof Memory === 'undefined') return LEVELS.info;
    if (!Memory.log) Memory.log = {};
    Memory.log.level = n != null ? n : LEVELS.info;
    return Memory.log.level;
};

// Core levels
Log.log = function (msg, tag) {
    if (!enabled('log')) return;
    console.log(fmt(tag, msg, 'log'));
};
Log.info = function (msg, tag) {
    if (!enabled('info')) return;
    (console.info || console.log)(fmt(tag, msg, 'info'));
};
Log.warn = function (msg, tag) {
    if (!enabled('warn')) return;
    (console.warn || console.log)(fmt(tag, msg, 'warn'));
};
Log.error = function (msg, tag) {
    if (!enabled('error')) return;
    (console.error || console.log)(fmt(tag, msg, 'error'));
};
Log.debug = function (msg, tag) {
    if (!enabled('debug')) return;
    (console.debug || console.log)(fmt(tag || 'debug', msg, 'debug'));
};

// Diagnostics and flow
Log.assert = function (condition, msg, tag) {
    if (console.assert) console.assert(!!condition, fmt(tag || 'assert', msg));
    else if (!condition) Log.warn(fmt(tag || 'assert', msg));
};
Log.count = function (label) {
    if (console.count) console.count(label || 'count');
};
Log.dir = function (obj, options) {
    if (console.dir) console.dir(obj, options);
    else console.log(obj);
};
Log.trace = function (msg, tag) {
    if (console.trace) console.trace(fmt(tag || 'trace', msg, 'trace'));
    else console.log(fmt(tag || 'trace', msg, 'trace'));
};

// Grouping
Log.group = function (label) {
    if (console.group) console.group(label || 'group');
};
Log.groupEnd = function () {
    if (console.groupEnd) console.groupEnd();
};

// Performance helpers (safe-guarded for Screeps env)
Log.profile = function (label) {
    if (console.profile) console.profile(label || 'profile');
};
Log.profileEnd = function (label) {
    if (console.profileEnd) console.profileEnd(label || 'profile');
};
Log.time = function (label) {
    if (console.time) console.time(label || 'timer');
};
Log.timeEnd = function (label) {
    if (console.timeEnd) console.timeEnd(label || 'timer');
};
Log.timeStamp = function (label) {
    if (console.timeStamp) console.timeStamp(label || 'stamp');
};

// Tables and memory
Log.table = function (data, columns) {
    if (console.table) console.table(data, columns);
    else Log.log(JSON.stringify(data));
};
Log.memory = function () {
    if (console.memory) Log.info('memory: ' + JSON.stringify(console.memory));
    else Log.debug('console.memory not available');
};

// Log when a tracked value changes (per key); stores last value in Memory
// Usage:
//   Log.onChange('ext.plan.W1N1', { need, built, sites, allowed },
//                (v) => `planning up to ${v.need} extensions (built=${v.built}, sites=${v.sites}, allowed=${v.allowed})`,
//                room.name, 'info');
Log.onChange = function (key, value, msgOrFn, tag, level) {
    if (!key) return;
    const root = Memory.__logChange || (Memory.__logChange = {});
    // Normalize value to a comparable string; cheap for primitives/small objects
    let vStr;
    if (value == null) vStr = 'null';
    else if (typeof value === 'string') vStr = value;
    else if (typeof value === 'number' || typeof value === 'boolean') vStr = String(value);
    else {
        try {
            vStr = JSON.stringify(value);
        } catch (err) {
            if (Log.error)
                Log.error('Logger error in JSON.stringify', err && err.stack ? err.stack : err);
            vStr = String(value);
        }
    }
    if (root[key] === vStr) return; // unchanged → suppress
    root[key] = vStr;
    const message =
        typeof msgOrFn === 'function'
            ? msgOrFn(value)
            : msgOrFn != null
              ? msgOrFn
              : key + ': ' + vStr;
    const lvl = level || 'info';
    const fn = Log[lvl] || Log.info;
    fn(message, tag);
};

// Tag helper
Log.withTag = function (tag) {
    return {
        log: (m) => Log.log(m, tag),
        info: (m) => Log.info(m, tag),
        warn: (m) => Log.warn(m, tag),
        error: (m) => Log.error(m, tag),
        debug: (m) => Log.debug(m, tag),
        onChange: (key, value, msgOrFn, level) => Log.onChange(key, value, msgOrFn, tag, level),
        assert: (c, m) => Log.assert(c, m, tag),
        count: (label) => Log.count(label),
        dir: (obj, opts) => Log.dir(obj, opts),
        trace: (m) => Log.trace(m, tag),
        group: (label) => Log.group(label),
        groupEnd: () => Log.groupEnd(),
        profile: (label) => Log.profile(label),
        profileEnd: (label) => Log.profileEnd(label),
        time: (label) => Log.time(label),
        timeEnd: (label) => Log.timeEnd(label),
        timeStamp: (label) => Log.timeStamp(label),
        table: (data, cols) => Log.table(data, cols),
        memory: () => Log.memory(),
        every: (n, msgOrFn, overrideTag) => Log.every(n, msgOrFn, overrideTag || tag),
        once: (key, msg, overrideTag) => Log.once(key, msg, overrideTag || tag),
    };
};

// Log once per unique key (persists in Memory)
Log.once = function (key, msg, tag) {
    const root = Memory.__logOnce || (Memory.__logOnce = {});
    if (root[key]) return;
    root[key] = Game.time;
    Log.info(msg, tag);
};

// Log every N ticks; takes string or function returning string
Log.every = function (n, msgOrFn, tag) {
    if (n <= 0) return;
    if (Game.time % n !== 0) return;
    const m = typeof msgOrFn === 'function' ? msgOrFn() : msgOrFn;
    Log.info(m, tag);
};

// Construction aggregation (group all sites created this tick into one line per room)
Log.construction = {
    record(room, type, x, y, meta) {
        try {
            if (!global.__constructAgg || global.__constructAgg.tick !== Game.time) {
                global.__constructAgg = { tick: Game.time, events: [], seen: new Set() };
            }
            const agg = global.__constructAgg;
            if (!agg.seen) agg.seen = new Set();
            const key = room + '|' + type + '|' + x + ',' + y;
            if (agg.seen.has(key)) return; // dedupe same tick
            agg.seen.add(key);
            agg.events.push({ room, type, x, y, meta: meta || {} });
        } catch (e) {
            console.log('Logger error in construction aggregation', e && e.stack ? e.stack : e);
        }
    },
    // Auto-scan newly created sites (diff from last tick) for types without explicit managers.
    autoScan() {
        try {
            const scanKey = '__constructScan';
            const prev = (global[scanKey] && global[scanKey].ids) || new Set();
            const curIds = new Set();
            const whitelist = new Set([
                STRUCTURE_SPAWN,
                STRUCTURE_EXTENSION,
                STRUCTURE_ROAD,
                STRUCTURE_RAMPART,
                STRUCTURE_WALL,
                STRUCTURE_CONTAINER,
                STRUCTURE_TOWER,
                STRUCTURE_STORAGE,
                STRUCTURE_TERMINAL,
                STRUCTURE_LINK,
                STRUCTURE_LAB,
                STRUCTURE_FACTORY,
                STRUCTURE_OBSERVER,
                STRUCTURE_POWER_SPAWN,
                STRUCTURE_NUKER,
            ]);
            const sites = Game.constructionSites || {};
            for (const id in sites) {
                const s = sites[id];
                curIds.add(id);
                if (!prev.has(id) && whitelist.has(s.structureType)) {
                    Log.construction.record(s.pos.roomName, s.structureType, s.pos.x, s.pos.y, {});
                }
            }
            global[scanKey] = { tick: Game.time, ids: curIds };
        } catch (e) {
            console.log('Logger error in autoScan', e && e.stack ? e.stack : e);
        }
    },
    flush() {
        const agg = global.__constructAgg;
        if (!agg || agg.tick !== Game.time || !agg.events.length) return;
        const roomMap = new Map();
        for (const ev of agg.events) {
            if (!roomMap.has(ev.room)) roomMap.set(ev.room, new Map());
            const typeMap = roomMap.get(ev.room);
            if (!typeMap.has(ev.type)) typeMap.set(ev.type, []);
            typeMap.get(ev.type).push(ev);
        }
        // Guidance catalog dependency injection helper
        let _guidanceCatalog = null;
        Log.setGuidanceCatalog = function (catalog) {
            _guidanceCatalog = catalog;
        };

        function getGuidanceCatalog() {
            if (_guidanceCatalog) return _guidanceCatalog;
            try {
                return require('catalog.guidance');
            } catch (e) {
                console.log('Logger error loading catalog.guidance', e && e.stack ? e.stack : e);
                return null;
            }
        }

        const tipsFor = (code) => {
            const guidanceCatalog = getGuidanceCatalog();
            if (!code || !guidanceCatalog) return [];
            const entry = guidanceCatalog[code];
            return entry && Array.isArray(entry.tips) ? entry.tips : [];
        };

        const ref = {
            road: { file: 'manager.road.js', code: 'ROAD_SITE' },
            container: { file: 'manager.container.js', code: 'CONT_SITE' },
            extension: { file: 'manager.extension.js', code: 'EXT_SITE' },
            rampart: { file: 'manager.wall.js', code: 'RAMPART_SITE_RING' },
            spawn: { file: 'manager.spawner.js', code: 'SPAWN_SITE' },
            tower: { file: 'manager.tower.js', code: 'TOWER_SITE' },
            storage: { file: 'manager.storage.js', code: 'STORAGE_SITE' },
            terminal: { file: 'manager.terminal.js', code: 'TERMINAL_SITE' },
            link: { file: 'service.links.js', code: 'LINK_SITE' },
            lab: { file: 'manager.lab.js', code: 'LAB_SITE' },
            factory: { file: 'manager.factory.js', code: 'FACTORY_SITE' },
            observer: { file: 'manager.observer.js', code: 'OBSERVER_SITE' },
            powerspawn: { file: 'manager.power.js', code: 'POWER_SPAWN_SITE' },
            nuker: { file: 'manager.nuker.js', code: 'NUKER_SITE' },
            wall: { file: 'manager.wall.js', code: 'WALL_SITE' },
        };

        const verbose = !!(Memory.log && Memory.log.verboseSites);
        for (const [room, typeMap] of roomMap) {
            for (const [type, list] of typeMap) {
                const placedList = list.filter((ev) => ev.meta && ev.meta.placed);
                if (!placedList.length) continue; // only log actual placements
                placedList.sort((a, b) => a.x - b.x || a.y - b.y);
                const baseType = type === 'power_spawn' ? 'powerspawn' : type;
                const coords = placedList.map((e) => `${e.x},${e.y}`).join('; ');
                const plural = placedList.length > 1 ? 's' : '';
                const r = ref[baseType] || { file: 'manager.unknown.js', code: 'SITE' };
                if (!verbose) {
                    if (baseType === 'road') {
                        // Summary + guidance for roads (sample coords + help lines)
                        const count = placedList.length;
                        const sampleN = Math.min(5, count);
                        const coordArr = placedList.map((e) => `${e.x},${e.y}`);
                        const sample =
                            coordArr.slice(0, sampleN).join('; ') + (count > sampleN ? ' …' : '');
                        const g = tipsFor(r.code);
                        const how = g.length
                            ? ['How to resolve:', ...g.map((line) => ' - ' + line)].join('\n')
                            : '';
                        const where = `Where: file=${r.file} room=${room}`;
                        const refLine = `Ref: ${r.code}`;
                        const full = [
                            `site:roads placed x${count}`,
                            `@ coords: ${sample}`,
                            how,
                            where,
                            refLine,
                        ]
                            .filter(Boolean)
                            .join('\n');
                        Log.info(full, baseType);
                    } else {
                        // Compact single-line form (unchanged for other types)
                        Log.info(
                            `site:${baseType}${plural} ${room} ${coords} ref=${r.code}`,
                            baseType
                        );
                    }
                } else {
                    const g = tipsFor(r.code);
                    const header = `Created ${baseType} site${plural} at ${coords}`;
                    const how = g.length
                        ? ['How to resolve:', ...g.map((line) => ' - ' + line)].join('\n')
                        : '';
                    const where = `Where: file=${r.file} room=${room}`;
                    const refLine = `Ref: ${r.code}`;
                    const full = [header, how, where, refLine].filter(Boolean).join('\n');
                    Log.info(full, baseType);
                }
            }
        }
        agg.events.length = 0;
    },
};
