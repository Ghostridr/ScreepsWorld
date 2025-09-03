/* eslint-env screeps */
// Structured logger for Screeps (CommonJS). Wraps console.* with tags and tick timestamps.
// Usage: const Log = require('util.logger'); Log.info('hello'); Log.warn('issue'); Log.error('bad');
// Extras: Log.withTag('spawner').info('queued'); Log.every(20, () => 'heartbeat'); Log.once('key','msg')

const Log = module.exports;
let COLORS;
try {
    COLORS = require('config.colors');
} catch (e) {
    void e;
    COLORS = null;
}

function ts() {
    return 'T=' + Game.time;
}
function fmt(tag, msg, level) {
    const prefix = tag ? '[' + ts() + '][' + tag + '] ' : '[' + ts() + '] ';
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
    if (console.group) console.group('[' + ts() + '] ' + (label || 'group'));
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
            void err; // ignore
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
