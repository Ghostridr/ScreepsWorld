/* eslint-env screeps */
// util.caching.js — tiny TTL cache helpers (Memory-friendly) and per-tick memoization.

function now() {
    return global.Game && typeof Game.time === 'number' ? Game.time : 0;
}

function get(root, key) {
    if (!root || typeof root !== 'object') return null;
    const n = root[key];
    if (!n) return null;
    const t = now();
    if (n.exp && n.exp <= t) {
        delete root[key];
        return null;
    }
    return n.val;
}

function set(root, key, val, ttl) {
    if (!root || typeof root !== 'object') return val;
    const t = now();
    const exp = typeof ttl === 'number' && ttl > 0 ? t + ttl : 0;
    root[key] = { val, exp };
    return val;
}

function del(root, key) {
    if (!root || typeof root !== 'object') return false;
    if (root[key] == null) return false;
    delete root[key];
    return true;
}

function sweep(root, max) {
    if (!root || typeof root !== 'object') return 0;
    const t = now();
    let n = 0;
    const limit = typeof max === 'number' && max > 0 ? max : 50;
    for (const k in root) {
        const e = root[k];
        if (e && e.exp && e.exp <= t) {
            delete root[k];
            n++;
            if (n >= limit) break;
        }
    }
    return n;
}

function memo(root, key, computeFn, ttl) {
    const hit = get(root, key);
    if (hit != null) return hit;
    const val = computeFn();
    set(root, key, val, ttl);
    return val;
}

function tickRoot() {
    const t = now();
    const g = global;
    const C = g.__tickCache || (g.__tickCache = { t: -1, map: Object.create(null) });
    if (C.t !== t) {
        C.t = t;
        C.map = Object.create(null);
    }
    return C.map;
}

function tickGet(key) {
    const m = tickRoot();
    return m[key];
}

function tickSet(key, val) {
    const m = tickRoot();
    m[key] = val;
    return val;
}

function tickMemo(key, computeFn) {
    const m = tickRoot();
    if (Object.prototype.hasOwnProperty.call(m, key)) return m[key];
    m[key] = computeFn();
    return m[key];
}

module.exports = {
    now,
    get,
    set,
    del,
    sweep,
    memo,
    tickGet,
    tickSet,
    tickMemo,
};
