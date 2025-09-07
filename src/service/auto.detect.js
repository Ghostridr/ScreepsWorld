/* eslint-env screeps */
// service.auto.detect.js — Detect nearby hostiles and enforce safe behavior (retreat, spawn access)
var Log = require('util.logger').withTag('threat');

function posToObj(pos) {
    return { x: pos.x, y: pos.y, roomName: pos.roomName };
}
function objToPos(o) {
    return new RoomPosition(o.x, o.y, o.roomName);
}
function nearestHostileTo(room, anchor) {
    var hostiles = room.find(FIND_HOSTILE_CREEPS) || [];
    if (!hostiles.length) return null;
    var best = null;
    var bestD = 1e9;
    for (var i = 0; i < hostiles.length; i++) {
        var h = hostiles[i];
        var d = anchor.pos.getRangeTo(h);
        if (d < bestD) {
            bestD = d;
            best = h;
        }
    }
    return best ? { creep: best, range: bestD } : null;
}
function updateThreat(room) {
    if (!room) return;
    var mem = (Memory.rooms[room.name] = Memory.rooms[room.name] || {});
    var spawns = room.find(FIND_MY_SPAWNS) || [];
    var anchor = spawns[0] || room.controller || { pos: new RoomPosition(25, 25, room.name) };
    var info = nearestHostileTo(room, anchor);
    var t = mem.threat || (mem.threat = {});
    var lastRange = typeof t.rangeToSpawn === 'number' ? t.rangeToSpawn : null;
    if (!info) {
        mem.threat = { active: false, updated: Game.time };
        // Log once per state change: threat cleared in this room
        Log.onChange('rooms.' + room.name + '.threat.active', false, 'threat cleared', 'info');
        return mem.threat;
    }
    var h = info.creep;
    var dangerRadius = 6;
    var rangeToSpawn = info.range;
    var gettingCloser = lastRange != null ? rangeToSpawn < lastRange : false;
    var exitPos = null;
    if (spawns.length) {
        var s = spawns[0];
        var best = null;
        var bestScore = -1;
        for (var dx = -1; dx <= 1; dx++) {
            for (var dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                var x = s.pos.x + dx;
                var y = s.pos.y + dy;
                if (x < 1 || y < 1 || x > 48 || y > 48) continue;
                var p = new RoomPosition(x, y, room.name);
                var terrain = room.getTerrain().get(x, y);
                if (terrain === TERRAIN_MASK_WALL) continue;
                var r = p.getRangeTo(h);
                var score = r;
                if (score > bestScore) {
                    bestScore = score;
                    best = p;
                }
            }
        }
        exitPos = best ? posToObj(best) : null;
    }
    t.active = true;
    t.hostileId = h.id;
    t.hostilePos = posToObj(h.pos);
    t.rangeToSpawn = rangeToSpawn;
    t.gettingCloser = !!gettingCloser;
    t.dangerRadius = dangerRadius;
    t.exitPos = exitPos;
    t.updated = Game.time;
    mem.threat = t;
    // Log once per state change: threat active with current range to spawn
    Log.onChange(
        'rooms.' + room.name + '.threat.active',
        true,
        function () {
            return 'threat active (rangeToSpawn=' + t.rangeToSpawn + ')';
        },
        'info'
    );
    return t;
}
function shouldRetreat(creep, t) {
    if (!t || !t.active) return false;
    try {
        var hpos = objToPos(t.hostilePos);
        var r = creep.pos.getRangeTo(hpos);
        if (r <= (t.dangerRadius || 6)) return true;
        if (t.gettingCloser && t.rangeToSpawn < 8) {
            var room = creep.room;
            var sp = room.find(FIND_MY_SPAWNS)[0];
            if (sp) {
                var toSpawn = creep.pos.getRangeTo(sp);
                var hostileToSpawn = hpos.getRangeTo(sp);
                if (toSpawn < hostileToSpawn) return true;
            }
        }
    } catch (e) {
        void e;
    }
    return false;
}
function retreat(creep, t) {
    var room = creep.room;
    var sp = room.find(FIND_MY_SPAWNS)[0];
    try {
        var center = objToPos(t.hostilePos);
        var desired = (t.dangerRadius || 6) + 2;
        var res = PathFinder.search(creep.pos, [{ pos: center, range: desired }], {
            flee: true,
            maxRooms: 1,
            plainCost: 2,
            swampCost: 10,
        });
        if (res && res.path && res.path.length) {
            var avoid = t && t.exitPos ? objToPos(t.exitPos) : null;
            if (!(avoid && res.path.length === 1 && res.path[0].isEqualTo(avoid))) {
                creep.moveByPath(res.path);
                return;
            }
        }
    } catch (e) {
        void e;
    }
    if (!sp) return;
    var range = 2;
    var dest = sp.pos;
    var moveOpts = { reusePath: 5, visualizePathStyle: { stroke: '#ffaa00' } };
    if (t && t.exitPos) {
        var exit = objToPos(t.exitPos);
        if (creep.pos.isEqualTo(exit)) {
            for (var d = 1; d <= 8; d++) {
                var dir = d;
                var nx = creep.pos.x + [-1, 0, 1, -1, 1, -1, 0, 1][d - 1];
                var ny = creep.pos.y + [-1, -1, -1, 0, 0, 1, 1, 1][d - 1];
                if (nx < 1 || ny < 1 || nx > 48 || ny > 48) continue;
                var terrain = room.getTerrain().get(nx, ny);
                if (terrain === TERRAIN_MASK_WALL) continue;
                creep.move(dir);
                return;
            }
        }
    }
    creep.moveTo(dest, moveOpts);
    if (creep.pos.getRangeTo(dest) < range) creep.moveTo(dest, { range: range });
}
var Threat = {};
Threat.scan = function (room) {
    return updateThreat(room);
};
Threat.enforce = function (room) {
    var t = (Memory.rooms[room.name] && Memory.rooms[room.name].threat) || null;
    if (!t || !t.active) return;
    var creeps = room.find(FIND_MY_CREEPS) || [];
    for (var i = 0; i < creeps.length; i++) {
        var c = creeps[i];
        if (shouldRetreat(c, t)) retreat(c, t);
    }
};
Threat.isDanger = function (pos, roomName) {
    var r = Game.rooms[roomName || (pos && pos.roomName)];
    if (!r) return false;
    var t = (Memory.rooms[r.name] && Memory.rooms[r.name].threat) || null;
    if (!t || !t.active) return false;
    try {
        var center = objToPos(t.hostilePos);
        return pos.getRangeTo(center) <= (t.dangerRadius || 6);
    } catch (e) {
        void e;
        return false;
    }
};
module.exports = Threat;
