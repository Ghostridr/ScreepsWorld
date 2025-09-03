/* eslint-env screeps */
// service.say.js — Centralized, low-noise creep.say helper with a compact catalog.
// Goals: short emoji + task (e.g., "⛏ mine"), dedup between ticks, CPU/bucket friendly. Periodic fun quips.

const CATALOG = {
    // Primary tasks (emoji + short verb)
    HARVEST: '🔄',
    WITHDRAW: '⬇️',
    TRANSFER: '⬆️',
    BUILD: '🚧',
    UPG: '⚡',
    REPAIR: '🛠',
    MINE: '⛏',
    HAUL: '📦',
    IDLE: '…',
    MOVE: '➡️',
    BLOCKED: '⛔',
    // Structures (tags)
    EXT: '🧩 ext',
    CONT: '🔲 cont',
    ROAD: '🛣 road',
    CTRL: '🎛 ctl',
};

// Try to load defaults from config if available (optional, avoids hard-coding)
var DEFAULTS = {
    enabled: true, // Memory.settings.say.enabled
    minInterval: 5, // ticks between identical messages per creep
    bucketFloor: 2000, // disable under low bucket to save CPU
};
try {
    var Cfg = require('config.constants');
    if (Cfg && Cfg.SAY_DEFAULTS) DEFAULTS = Cfg.SAY_DEFAULTS;
} catch (e) {
    // optional dependency; ignore if not present
    if (typeof e === 'object' && e && e.message && Game && Game.time < 0) {
        console.log(e.message);
    }
}

// Fun messages pool
var FUNNIES = [
    '🤖 beep',
    '🪫 low?',
    '🛠 fixit',
    '🧭 lost?',
    '🧠 think',
    '🫡 o7',
    '🧱 oops',
    '🍞 carb up',
    '💤 nap?',
    '📦 boxes!',
    '🧪 lab time',
];

// Longer, flavor messages (printed rarely; not length-limited)
var FUNNIES_LONG = [
    '🧰 Building the future, one tile at a time',
    '📦 Logistics win wars — keep the boxes moving',
    '🛣 More roads, less toads (swamps)!',
    '🔋 Energy low — ping haulers to refill',
    '🏗 Extension push — capacity is king',
    '🛡 Towers hungry? Feed the defenses',
    '🧭 Path blocked — requesting road service',
    '⛏ Mining nonstop — container is my throne',
    '🧠 Think in pipelines: producer → hauler → consumer',
    '🎯 Shorter paths, faster growth',
    '🚀 Shipping energy like a boss',
];

function cfg() {
    if (typeof Memory.settings !== 'object' || Memory.settings == null) Memory.settings = {};
    const root = Memory.settings;
    if (typeof root.say !== 'object' || root.say == null) root.say = {};
    const s = root.say;
    if (typeof s.enabled !== 'boolean') s.enabled = DEFAULTS.enabled;
    if (typeof s.minInterval !== 'number') s.minInterval = DEFAULTS.minInterval;
    if (typeof s.bucketFloor !== 'number') s.bucketFloor = DEFAULTS.bucketFloor;
    if (typeof s.funny !== 'boolean') s.funny = true;
    if (typeof s.funEvery !== 'number') s.funEvery = 100; // ticks cadence
    if (typeof s.funBucketFloor !== 'number') s.funBucketFloor = 2000;
    if (typeof s.funnyLong !== 'boolean') s.funnyLong = true;
    if (typeof s.funLongEvery !== 'number') s.funLongEvery = 400; // rarer cadence
    if (typeof s.funLongBucketFloor !== 'number') s.funLongBucketFloor = 4000;
    return s;
}

function shortNum(n) {
    if (n == null) return '';
    if (n < 1000) return String(n);
    const k = Math.floor(n / 100) / 10; // one decimal
    return (k >= 10 ? Math.round(k) : k.toFixed(1)) + 'k';
}

function buildMsg(key, opts) {
    opts = opts || {};
    const base = CATALOG[key] || key;
    const n = opts.n != null ? shortNum(opts.n) : '';
    const pct = opts.pct != null ? Math.max(0, Math.min(100, Math.round(opts.pct))) + '%' : '';
    // Prefer including number; drop extras if too long
    let msg = base;
    if (n) msg = msg + ' ' + n;
    if (pct) msg = msg + (n ? '' : ' ') + pct; // avoid extra space if already long
    // Enforce 12-char limit (emoji + short task). Prefer to keep pct if present.
    if (msg.length > 12) {
        // Always keep pct if present; shrink base to fit within 12 chars
        if (pct) {
            const maxBase = Math.max(1, 12 - 1 - pct.length);
            msg = base.slice(0, maxBase) + ' ' + pct;
        } else if (n) {
            const nStr = String(n);
            const maxBase = Math.max(1, 12 - 1 - nStr.length);
            msg = base.slice(0, maxBase) + ' ' + nStr;
        } else {
            msg = msg.slice(0, 12);
        }
    }
    return msg;
}

function shouldSpeak(creep, msg, options) {
    options = options || {};
    const s = cfg();
    if (!s.enabled) return false;
    if (Game.cpu && Game.cpu.bucket != null && Game.cpu.bucket < s.bucketFloor) return false;
    if (typeof creep.memory !== 'object' || creep.memory == null) creep.memory = {};
    const mem = creep.memory;
    const last = mem._lastSay;
    const lastTick = typeof mem._sayTick === 'number' ? mem._sayTick : -Infinity;
    if (options.force) return true;
    if (msg !== last) return true; // changed message → allow immediately
    return Game.time - lastTick >= s.minInterval;
}

function doSay(creep, msg) {
    creep.say(msg, true);
    creep.memory._lastSay = msg;
    creep.memory._sayTick = Game.time;
}

const Say = {};

// say(creep, key, opts?) — opts: { n, pct, force }
Say.say = function (creep, key, opts) {
    opts = opts || {};
    const msg = buildMsg(key, opts);
    if (shouldSpeak(creep, msg, opts)) doSay(creep, msg);
};

// once(creep, key, opts?) — speak this key only once per life
Say.once = function (creep, key, opts) {
    opts = opts || {};
    const flagKey = '_said_' + key;
    if (creep.memory[flagKey]) return;
    const msg = buildMsg(key, opts);
    doSay(creep, msg);
    creep.memory[flagKey] = true;
};

// every(creep, key, n=20, opts?) — speak periodically
Say.every = function (creep, key, n, opts) {
    if (n == null) n = 20;
    opts = opts || {};
    if (Game.time % n !== 0) return;
    const msg = buildMsg(key, opts);
    // Avoid object spread for parser compatibility
    const merged = {};
    for (const k in opts) merged[k] = opts[k];
    merged.force = true;
    if (shouldSpeak(creep, msg, merged)) doSay(creep, msg);
};

// changed(creep, key, opts?) — speak when composed message changes (ignores interval)
Say.changed = function (creep, key, opts) {
    opts = opts || {};
    const msg = buildMsg(key, opts);
    if (creep.memory._lastSay !== msg) doSay(creep, msg);
};

Say.raw = function (key) {
    return CATALOG[key] || key;
};

Say.set = function (key, val) {
    CATALOG[key] = val;
};

Say.config = cfg;

// Periodic funny line for morale; respects CPU bucket and cadence.
Say.funny = function (creep, n) {
    // Global, low-noise scheduler: at most one creep says a funny line at a random cadence.
    const s = cfg();
    if (!s.funny) return;
    if (Game.cpu && Game.cpu.bucket != null && Game.cpu.bucket < s.funBucketFloor) return;

    // Determine randomized interval window from the legacy cadence (funEvery) if caller didn't pass n
    // Window: [0.25×n, 3×n], clamped to [1, Infinity)
    if (n == null) n = s.funEvery;
    var minTicks = Math.max(1, Math.floor(n * 0.25));
    var maxTicks = Math.max(minTicks + 1, Math.floor(n * 3));

    // Ensure scheduler state exists under settings.say (single-writer: this service)
    var sched = s._funnySched;
    if (!sched || typeof sched !== 'object') {
        sched = s._funnySched = {
            nextTick: Game.time + randInt(minTicks, maxTicks),
            creepName: null,
        };
    }

    // If it's not time yet, nothing to do
    if (typeof sched.nextTick !== 'number')
        sched.nextTick = Game.time + randInt(minTicks, maxTicks);
    if (Game.time < sched.nextTick) return;

    // If the chosen creep is gone or not set, pick a random live creep now
    if (!sched.creepName || !Game.creeps[sched.creepName]) {
        var names = Object.keys(Game.creeps);
        if (names.length === 0) {
            // No creeps to speak; reschedule and bail
            sched.nextTick = Game.time + randInt(minTicks, maxTicks);
            sched.creepName = null;
            return;
        }
        sched.creepName = names[randInt(0, names.length - 1)];
    }

    // Only the selected creep speaks this tick
    if (creep.name !== sched.creepName) return;

    // Pick a message with some entropy
    var seed = 0;
    for (var i = 0; i < creep.name.length; i++) seed = (seed * 31 + creep.name.charCodeAt(i)) >>> 0;
    var idx = (seed + Game.time) % FUNNIES.length;
    var msg = FUNNIES[idx];
    if (shouldSpeak(creep, msg, { force: true })) doSay(creep, msg);

    // Reschedule the next speaker/time now, clearing current selection
    sched.nextTick = Game.time + randInt(minTicks, maxTicks);
    sched.creepName = null;
};

// Utility: inclusive integer in [a, b]
function randInt(a, b) {
    if (b < a) {
        var t = a;
        a = b;
        b = t;
    }
    return a + Math.floor(Math.random() * (b - a + 1));
}

// Allow runtime tweaks to the funny pool
Say.addFunny = function (s) {
    if (typeof s === 'string' && s) FUNNIES.push(s);
};

Say.listFunny = function () {
    return FUNNIES.slice();
};

// Rare long quips (emoji + sentence). Bypasses length limits.
Say.funnyLong = function (creep, n) {
    const s = cfg();
    if (!s.funnyLong) return;
    if (Game.cpu && Game.cpu.bucket != null && Game.cpu.bucket < s.funLongBucketFloor) return;
    if (n == null) n = s.funLongEvery;
    if (Game.time % n !== 0) return;
    // Use a deterministic base per-creep then add time drift
    var seed = 0;
    for (var i = 0; i < creep.name.length; i++) seed = (seed * 33 + creep.name.charCodeAt(i)) >>> 0;
    const idx = (seed + Math.floor(Game.time / n)) % FUNNIES_LONG.length;
    const msg = FUNNIES_LONG[idx];
    if (shouldSpeak(creep, msg, { force: true })) doSay(creep, msg);
};

Say.addFunnyLong = function (s) {
    if (typeof s === 'string' && s) FUNNIES_LONG.push(s);
};

Say.listFunnyLong = function () {
    return FUNNIES_LONG.slice();
};

module.exports = Say;
