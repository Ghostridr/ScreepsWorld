/* eslint-env screeps */
// manager.road.js — Place roads on most direct lines between key points.
// Lightweight: lay at most one site per tick per room.
const Log = require('util.logger').withTag('roads');
const G = require('helper.guidance');

function line(from, to) {
    const path = PathFinder.search(
        from.pos || from,
        { pos: to.pos || to, range: 1 },
        {
            roomCallback(_roomName) {
                // Default cost matrix; optionally prefer plains vs swamp by small delta
                return new PathFinder.CostMatrix();
            },
            maxOps: 2000,
            swampCost: 10,
            plainCost: 2,
            flee: false,
        }
    ).path;
    return path;
}

function placeRoadAt(room, pos) {
    if (pos.x < 1 || pos.y < 1 || pos.x > 48 || pos.y > 48) return ERR_INVALID_TARGET;
    if (
        room
            .lookForAt(LOOK_STRUCTURES, pos.x, pos.y)
            .some((s) => s.structureType === STRUCTURE_ROAD)
    )
        return ERR_FULL;
    if (room.lookForAt(LOOK_CONSTRUCTION_SITES, pos.x, pos.y).length) return ERR_FULL;
    return room.createConstructionSite(pos.x, pos.y, STRUCTURE_ROAD);
}

module.exports.loop = function () {
    for (const name in Game.spawns) {
        const spawn = Game.spawns[name];
        const room = spawn.room;
        // Key anchors
        const sources = room.find(FIND_SOURCES);
        const ctl = room.controller;
        // Try one placement per tick to keep cheap
        // 1) spawn <-> each source
        for (const src of sources) {
            const path = line(spawn, src);
            for (const p of path) {
                const res = placeRoadAt(room, p);
                if (res === OK) {
                    Log.info(
                        G.info(
                            null,
                            null,
                            { file: 'manager.road.js', room: room.name },
                            'ROAD_SITE',
                            {
                                x: p.x,
                                y: p.y,
                                link: 'spawn↔src',
                            }
                        )
                    );
                    return; // one per tick
                }
            }
        }
        // 2) spawn <-> controller
        if (ctl) {
            const path = line(spawn, ctl);
            for (const p of path) {
                const res = placeRoadAt(room, p);
                if (res === OK) {
                    Log.info(
                        G.info(
                            null,
                            null,
                            { file: 'manager.road.js', room: room.name },
                            'ROAD_SITE',
                            {
                                x: p.x,
                                y: p.y,
                                link: 'spawn↔ctl',
                            }
                        )
                    );
                    return;
                }
            }
        }
        // 3) containers near sources <-> spawn (if present)
        for (const src of sources) {
            const box = src.pos.findInRange(FIND_STRUCTURES, 1, {
                filter: (s) => s.structureType === STRUCTURE_CONTAINER,
            })[0];
            if (!box) continue;
            const path = line(box, spawn);
            for (const p of path) {
                const res = placeRoadAt(room, p);
                if (res === OK) {
                    Log.info(
                        G.info(
                            null,
                            null,
                            { file: 'manager.road.js', room: room.name },
                            'ROAD_SITE',
                            {
                                x: p.x,
                                y: p.y,
                                link: 'container↔spawn',
                            }
                        )
                    );
                    return;
                }
            }
        }
    }
};
