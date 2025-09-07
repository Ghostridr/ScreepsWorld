/* eslint-env screeps */
const Log = require('util.logger');

// config.debug.js — central on/off switches for optional debug / guidance / verbose logs.
// Single responsibility: define, initialize, and let you query or set debug flags.
// Usage (console):
//   const D = require('config.debug');
//   D.set('pathing', true);               // enable path visual + logs
//   D.set('roles.harvester', false);      // disable harvester guidance logs
//   D.set('managers.road', true);         // enable road planner logs
//   D.toggle('threat');                   // flip threat logging
//   D.list();                             // dump current flags
// Access inside code:
//   const Debug = require('config.debug');
//   if (Debug.is('pathing')) { ... }

// New hierarchical defaults (granular switches + master kill switches)
var DEFAULTS = {
    all: true, // global master (fast short-circuit)
    _dummy: function (e) {
        if (e) console.log('debug.js unused var:', e);
    },
    pathing: {
        enabled: false, // legacy aggregate on/off
        visual: true, // draw lines
        verbose: true, // console [PATHDBG] noise
        stats: true, // increment Memory.stats counters
        scatter: true, // spawn ring scatter heuristic
        bypass: true, // log bypass creation
    },
    spawn: { enabled: true, decisions: true },
    threat: { enabled: true },
    guidance: { enabled: true },
    heartbeat: { enabled: true },
    haul: { enabled: false, claim: false, release: false, queue: false },
    sources: { enabled: false, seats: false },
    build: { enabled: false, sweep: false },
    repair: { enabled: false, decisions: false },
    roles: {
        quiet: false, // master mute for all role chatter
        harvester: true,
        upgrader: true,
        builder: true,
        hauler: true,
        miner: true,
        healer: true,
        repairer: true,
    },
    managers: {
        container: false,
        road: false,
        extension: false,
        tower: false,
        wall: false,
        spawner: true,
    },
    services: {
        links: false,
        queue: false,
        stats: false,
    },
    metrics: { emit: true, dashboard: true },
    cpu: { profile: false, bucketWatch: false },
    sampling: { roomScan: 50, statsFlush: 20 },
    log: { rateLimitPerTick: 120 },
};

function ensureRoot() {
    if (!Memory.debug) Memory.debug = {};
    return Memory.debug;
}

function deepMerge(dst, src) {
    for (var k in src) {
        if (Object.prototype.hasOwnProperty.call(src, k)) {
            var sv = src[k];
            var dv = dst[k];
            if (sv && typeof sv === 'object' && !Array.isArray(sv)) {
                if (!dv || typeof dv !== 'object') dst[k] = {};
                deepMerge(dst[k], sv);
            } else if (dv === undefined) {
                dst[k] = sv;
            }
        }
    }
    return dst;
}

function pathGet(root, path) {
    var parts = path.split('.');
    var cur = root;
    for (var i = 0; i < parts.length; i++) {
        if (!cur) return undefined;
        cur = cur[parts[i]];
    }
    return cur;
}
function pathSet(root, path, value) {
    var parts = path.split('.');
    var cur = root;
    for (var i = 0; i < parts.length - 1; i++) {
        var p = parts[i];
        if (!cur[p] || typeof cur[p] !== 'object') cur[p] = {};
        cur = cur[p];
    }
    cur[parts[parts.length - 1]] = value;
}

function flattenDiff(diff, prefix, root, base) {
    for (var k in root) {
        if (!Object.prototype.hasOwnProperty.call(root, k)) continue;
        var path = prefix ? prefix + '.' + k : k;
        var rv = root[k];
        var bv = base ? base[k] : undefined;
        if (rv && typeof rv === 'object' && !Array.isArray(rv)) {
            flattenDiff(diff, path, rv, bv || {});
        } else {
            if (bv !== rv) diff[path] = { cur: rv, def: bv };
        }
    }
}

function wildcardOff(root, patternParts, idx) {
    if (!root) return;
    if (idx >= patternParts.length) return;
    var part = patternParts[idx];
    var last = idx === patternParts.length - 1;
    if (part === '*') {
        for (var k in root) {
            if (!Object.prototype.hasOwnProperty.call(root, k)) continue;
            if (last) {
                if (typeof root[k] === 'boolean') root[k] = false;
            } else if (root[k] && typeof root[k] === 'object')
                wildcardOff(root[k], patternParts, idx + 1);
        }
    } else if (root[part] != null) {
        if (last) {
            if (typeof root[part] === 'boolean') root[part] = false;
        } else if (typeof root[part] === 'object') {
            wildcardOff(root[part], patternParts, idx + 1);
        }
    }
}

function wildcardOn(root, patternParts, idx) {
    if (!root) return;
    if (idx >= patternParts.length) return;
    var part = patternParts[idx];
    var last = idx === patternParts.length - 1;
    if (part === '*') {
        for (var k in root) {
            if (!Object.prototype.hasOwnProperty.call(root, k)) continue;
            if (last) {
                if (typeof root[k] === 'boolean') root[k] = true;
            } else if (root[k] && typeof root[k] === 'object')
                wildcardOn(root[k], patternParts, idx + 1);
        }
    } else if (root[part] != null) {
        if (last) {
            if (typeof root[part] === 'boolean') root[part] = true;
        } else if (typeof root[part] === 'object') {
            wildcardOn(root[part], patternParts, idx + 1);
        }
    }
}

var DebugCfg = {
    init: function () {
        var root = ensureRoot();
        // Migrate legacy flat structure if present
        var legacyPathingBool = typeof root.pathing === 'boolean' ? root.pathing : undefined;
        deepMerge(root, DEFAULTS); // fill missing
        if (legacyPathingBool !== undefined) root.pathing.enabled = legacyPathingBool;
        if (typeof Memory.debugPathing === 'boolean') root.pathing.enabled = Memory.debugPathing;
        // Mirror for legacy code still checking Memory.debugPathing (aggregate)
        Memory.debugPathing = !!(
            root.pathing.enabled ||
            root.pathing.visual ||
            root.pathing.verbose
        );
        return root;
    },
    // Aggregate check: short-circuit on master or roles.quiet
    is: function (flagPath) {
        var root = ensureRoot();
        if (!root.all) return false;
        if (flagPath === 'pathing') {
            var p = root.pathing || {};
            return !!(p.enabled || p.visual || p.verbose);
        }
        // Allow shorthand like 'spawn' to mean 'spawn.enabled' if object
        var val = pathGet(root, flagPath);
        if (typeof val === 'boolean') return val;
        if (val && typeof val === 'object' && 'enabled' in val) return !!val.enabled;
        return !!val;
    },
    set: function (flagPath, value) {
        var root = ensureRoot();
        pathSet(root, flagPath, !!value);
        if (
            flagPath === 'pathing.enabled' ||
            flagPath === 'pathing.visual' ||
            flagPath === 'pathing.verbose' ||
            flagPath === 'pathing'
        ) {
            var p = root.pathing || {};
            Memory.debugPathing = !!(p.enabled || p.visual || p.verbose);
        }
        return !!value;
    },
    toggle: function (flagPath) {
        var cur = !this.is(flagPath);
        this.set(flagPath, cur);
        return cur;
    },
    when: function (flagPath, fn) {
        if (this.is(flagPath)) return fn();
    },
    scoped: function (prefix) {
        var self = this;
        return {
            is: function (suf) {
                return self.is(prefix + '.' + suf);
            },
            set: function (suf, v) {
                return self.set(prefix + '.' + suf, v);
            },
            when: function (suf, fn) {
                return self.when(prefix + '.' + suf, fn);
            },
        };
    },
    list: function () {
        var root = ensureRoot();
        try {
            console.log('[DEBUGCFG]', JSON.stringify(root));
        } catch (e) {
            if (typeof Log !== 'undefined' && Log.error)
                Log.error('Error in DebugCfg.list', { error: e.message, stack: e.stack });
        }
        return root;
    },
    diff: function () {
        var root = ensureRoot();
        var diff = {};
        flattenDiff(diff, '', root, DEFAULTS);
        try {
            console.log('[DEBUGCFG.diff]', JSON.stringify(diff));
        } catch (e) {
            if (typeof Log !== 'undefined' && Log.error)
                Log.error('Error in DebugCfg.diff', { error: e.message, stack: e.stack });
        }
        return diff;
    },
    reset: function () {
        Memory.debug = {};
        this.init();
        return ensureRoot();
    },
    off: function (pattern) {
        var root = ensureRoot();
        if (typeof pattern !== 'string' || !pattern) return;
        wildcardOff(root, pattern.split('.'), 0);
    },
    on: function (pattern) {
        var root = ensureRoot();
        if (typeof pattern !== 'string' || !pattern) return;
        wildcardOn(root, pattern.split('.'), 0);
    },
    enableAll: function () {
        var root = ensureRoot();
        root.all = true;
        return true;
    },
    disableAll: function () {
        var root = ensureRoot();
        root.all = false;
        return false;
    },
};
// Auto‑initialize defaults so D.list() shows populated tree without manual init.
try {
    DebugCfg.init();
} catch (e) {
    if (typeof Log !== 'undefined' && Log.error)
        Log.error('Error in DebugCfg.init', { error: e.message, stack: e.stack });
}
module.exports = DebugCfg;
