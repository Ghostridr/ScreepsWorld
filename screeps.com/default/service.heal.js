/* eslint-env screeps */
// service.heal.js — Centralized heal target selection (single responsibility: pick best creep to heal)

function nearestRange(pos, objs) {
    if (!objs || !objs.length) return 0;
    var best = Infinity;
    for (var i = 0; i < objs.length; i++) {
        var d = pos.getRangeTo(objs[i]);
        if (d < best) best = d;
    }
    return best === Infinity ? 0 : best;
}

function findInjured(room) {
    if (!room) return [];
    var list = room.find(FIND_MY_CREEPS, {
        filter: function (c) {
            return c.hits < c.hitsMax;
        },
    });
    return list || [];
}

// Pick the most damaged friendly; tie-break by distance to a spawn (cheap heuristic)
function pick(room) {
    var injured = findInjured(room);
    if (!injured.length) return null;
    var spawns = room.find ? room.find(FIND_MY_SPAWNS) : [];
    injured.sort(function (a, b) {
        var ra = a.hits / (a.hitsMax || 1);
        var rb = b.hits / (b.hitsMax || 1);
        if (ra !== rb) return ra - rb; // lower ratio first
        var da = spawns.length ? nearestRange(a.pos, spawns) : 0;
        var db = spawns.length ? nearestRange(b.pos, spawns) : 0;
        return da - db;
    });
    return injured[0] || null;
}

// Like pick(), but prefer closer to this creep when ratios are similar
function pickNear(creep) {
    if (!creep || !creep.room) return null;
    var injured = findInjured(creep.room);
    if (!injured.length) return null;
    injured.sort(function (a, b) {
        var ra = a.hits / (a.hitsMax || 1);
        var rb = b.hits / (b.hitsMax || 1);
        // If one is clearly more critical, take it
        if (Math.abs(ra - rb) > 0.1) return ra - rb;
        // Else pick nearer to healer
        return creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b);
    });
    return injured[0] || null;
}

// Fallback: search across all owned creeps in all rooms; prefer lowest HP ratio, then same-room,
// then approximate by linear room distance (cheap heuristic).
function pickGlobal() {
    if (!Game || !Game.creeps) return null;
    var list = [];
    for (var name in Game.creeps) {
        var c = Game.creeps[name];
        if (c && c.my && c.hits < c.hitsMax) list.push(c);
    }
    if (!list.length) return null;
    list.sort(function (a, b) {
        var ra = a.hits / (a.hitsMax || 1);
        var rb = b.hits / (b.hitsMax || 1);
        if (ra !== rb) return ra - rb;
        // Prefer same-room as the most common healer room (heuristic: first room in Game.rooms)
        var home = Object.keys(Game.rooms)[0];
        var ar = (a.room && a.room.name) || '';
        var br = (b.room && b.room.name) || '';
        if (home) {
            if (ar === home && br !== home) return -1;
            if (br === home && ar !== home) return 1;
        }
        // Then prefer by linear distance from home if available
        if (Game.map && Game.map.getRoomLinearDistance && home) {
            var da = Game.map.getRoomLinearDistance(home, ar);
            var db = Game.map.getRoomLinearDistance(home, br);
            return da - db;
        }
        return 0;
    });
    return list[0] || null;
}

module.exports = {
    pick: pick,
    pickNear: pickNear,
    findInjured: findInjured,
    pickGlobal: pickGlobal,
};
