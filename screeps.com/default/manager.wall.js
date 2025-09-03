/* eslint-env screeps */
/* global RoomPosition, ERR_INVALID_TARGET, ERR_FULL, STRUCTURE_RAMPART */
// manager.wall.js — Strategic rampart/wall placement (early simple perimeter with staggered pattern)
const Log = require('util.logger').withTag('walls');
const G = require('helper.guidance');

function ring(pos, radius) {
    const out = [];
    for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
            if (Math.abs(dx) + Math.abs(dy) !== radius) continue; // diamond ring (cheap)
            const x = pos.x + dx;
            const y = pos.y + dy;
            if (x < 1 || y < 1 || x > 48 || y > 48) continue;
            out.push(new RoomPosition(x, y, pos.roomName));
        }
    }
    return out;
}

function placeIfFree(room, pos, type) {
    if (room.getTerrain().get(pos.x, pos.y) === TERRAIN_MASK_WALL) return ERR_INVALID_TARGET;
    if (room.lookForAt(LOOK_STRUCTURES, pos).length) return ERR_FULL;
    if (room.lookForAt(LOOK_CONSTRUCTION_SITES, pos).length) return ERR_FULL;
    return room.createConstructionSite(pos, type);
}

module.exports.loop = function () {
    for (const name in Game.spawns) {
        const spawn = Game.spawns[name];
        const room = spawn.room;
        // Early heuristic: staggered rampart ring at radius 3..4 around spawn and controller
        const targets = [];
        [spawn.pos, room.controller && room.controller.pos].filter(Boolean).forEach((p) => {
            for (const r of [3, 4]) targets.push(...ring(p, r));
        });
        // Stagger pattern: every other tile to create honeycomb-like choke
        const pattern = targets.filter((p) => (p.x + p.y) % 2 === 0);
        for (const p of pattern) {
            const res = placeIfFree(room, p, STRUCTURE_RAMPART);
            if (res === OK) {
                Log.info(
                    G.info(
                        null,
                        null,
                        { file: 'manager.wall.js', room: room.name },
                        'RAMPART_SITE',
                        {
                            x: p.x,
                            y: p.y,
                        }
                    )
                );
                return; // one per tick
            }
        }
    }
};
