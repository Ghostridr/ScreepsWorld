/* eslint-env screeps */
// service.repair.js — Centralized repair policy (floors + target selection)

function floors(room) {
    const rcl = (room.controller && room.controller.level) || 0;
    return {
        road: 3000,
        container: 1500,
        tower: 600,
        rampart: Math.min(300000, 3000 * Math.max(1, rcl)), // grow with RCL
        wall: Math.min(300000, 1000 * Math.max(1, rcl)),
    };
}

// Pick a repair target for a tower (cheap heuristics)
function pickTargetForTower(tower) {
    const room = tower.room;
    const F = floors(room);

    // 1) Keep towers healthy first
    const hurtTower = tower.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_TOWER && s.hits < Math.min(s.hitsMax, F.tower),
    });
    if (hurtTower) return hurtTower;

    // 2) Critical ramparts near tower
    const ramp = tower.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_RAMPART && s.hits < F.rampart,
    });
    if (ramp) return ramp;

    // 3) Containers below floor
    const cont = tower.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: (s) =>
            s.structureType === STRUCTURE_CONTAINER && s.hits < Math.min(s.hitsMax, F.container),
    });
    if (cont) return cont;

    // 4) Roads below floor
    const road = tower.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_ROAD && s.hits < Math.min(s.hitsMax, F.road),
    });
    if (road) return road;

    // 5) Anything very damaged (<50%)
    const weak = tower.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: (s) => s.hits < s.hitsMax * 0.5,
    });
    return weak || null;
}

module.exports = {
    floors,
    pickTargetForTower,
    // Pick target for a creep: priority order using floors() and nearest-by-range within category
    pickTargetForCreep: function (room, pos) {
        if (!room) return null;
        var F = floors(room);
        function belowFloor(s) {
            var cap = 0;
            if (s.structureType === STRUCTURE_CONTAINER) cap = F.container;
            else if (s.structureType === STRUCTURE_ROAD) cap = F.road;
            else if (s.structureType === STRUCTURE_RAMPART) cap = F.rampart;
            else if (s.structureType === STRUCTURE_WALL) cap = F.wall;
            else if (s.structureType === STRUCTURE_TOWER) cap = F.tower;
            if (!cap) return false;
            return s.hits < Math.min(s.hitsMax || 0, cap);
        }
        function nearest(list) {
            if (!list || !list.length) return null;
            if (pos && pos.findClosestByRange) return pos.findClosestByRange(list);
            // fallback: first
            return list[0];
        }
        // Category scans
        var containers = room.find(FIND_STRUCTURES, {
            filter: function (s) {
                return s.structureType === STRUCTURE_CONTAINER && belowFloor(s);
            },
        });
        if (containers.length) return nearest(containers);

        var roads = room.find(FIND_STRUCTURES, {
            filter: function (s) {
                return s.structureType === STRUCTURE_ROAD && belowFloor(s);
            },
        });
        if (roads.length) return nearest(roads);

        var ramps = room.find(FIND_STRUCTURES, {
            filter: function (s) {
                return s.structureType === STRUCTURE_RAMPART && belowFloor(s);
            },
        });
        if (ramps.length) return nearest(ramps);

        var walls = room.find(FIND_STRUCTURES, {
            filter: function (s) {
                return s.structureType === STRUCTURE_WALL && belowFloor(s);
            },
        });
        if (walls.length) return nearest(walls);

        // Fallback: anything < 50%
        var weak = room.find(FIND_STRUCTURES, {
            filter: function (s) {
                return s.hits && s.hitsMax && s.hits < s.hitsMax * 0.5;
            },
        });
        return nearest(weak);
    },
};
