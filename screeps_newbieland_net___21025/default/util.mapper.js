/* eslint-env screeps */
// util.mapper.js — small, pure-ish mapping/indexing helpers and position key serializers
// Single responsibility: turn collections/IDs/positions into useful maps and back.
// No side effects; reads Game/RoomPosition when present.

function toPosKey(pos) {
    if (!pos) return null;
    const rn = pos.roomName || (pos.room && pos.room.name) || (pos.pos && pos.pos.roomName);
    const x = pos.x !== undefined && pos.x !== null ? pos.x : pos.pos && pos.pos.x;
    const y = pos.y !== undefined && pos.y !== null ? pos.y : pos.pos && pos.pos.y;
    if (rn == null || x == null || y == null) return null;
    return rn + ':' + x + ':' + y;
}

function fromPosKey(key) {
    if (typeof key !== 'string') return null;
    const parts = key.split(':');
    if (parts.length !== 3) return null;
    const roomName = parts[0];
    const x = Number(parts[1]);
    const y = Number(parts[2]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    if (typeof global.RoomPosition === 'function') return new global.RoomPosition(x, y, roomName);
    return { x, y, roomName };
}

function idsToObjects(ids, getter) {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    const get =
        typeof getter === 'function'
            ? getter
            : (id) => (global.Game && Game.getObjectById ? Game.getObjectById(id) : null);
    const out = [];
    for (let i = 0; i < ids.length; i++) {
        const o = get(ids[i]);
        if (o) out.push(o);
    }
    return out;
}

function objectsToIds(objects) {
    if (!Array.isArray(objects) || objects.length === 0) return [];
    const out = [];
    for (let i = 0; i < objects.length; i++) {
        const o = objects[i];
        if (o && o.id) out.push(o.id);
    }
    return out;
}

function keyer(keyOrFn) {
    if (typeof keyOrFn === 'function') return keyOrFn;
    if (typeof keyOrFn === 'string' && keyOrFn) return (v) => (v ? v[keyOrFn] : undefined);
    return (v) => v;
}

function indexBy(list, keyOrFn) {
    const fn = keyer(keyOrFn);
    const map = Object.create(null);
    if (!Array.isArray(list)) return map;
    for (let i = 0; i < list.length; i++) {
        const v = list[i];
        const k = fn(v);
        if (k != null) map[k] = v;
    }
    return map;
}

function groupBy(list, keyOrFn) {
    const fn = keyer(keyOrFn);
    const map = Object.create(null);
    if (!Array.isArray(list)) return map;
    for (let i = 0; i < list.length; i++) {
        const v = list[i];
        const k = fn(v);
        if (k == null) continue;
        const bucket = map[k] || (map[k] = []);
        bucket.push(v);
    }
    return map;
}

function countBy(list, keyOrFn) {
    const fn = keyer(keyOrFn);
    const map = Object.create(null);
    if (!Array.isArray(list)) return map;
    for (let i = 0; i < list.length; i++) {
        const v = list[i];
        const k = fn(v);
        if (k == null) continue;
        map[k] = (map[k] || 0) + 1;
    }
    return map;
}

function reuseKey(a, b) {
    if (a == null || b == null) return null;
    const A = String(a);
    const B = String(b);
    return A <= B ? A + '->' + B : B + '->' + A;
}

module.exports = {
    toPosKey,
    fromPosKey,
    idsToObjects,
    objectsToIds,
    indexBy,
    groupBy,
    countBy,
    reuseKey,
};
