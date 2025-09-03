/* eslint-env screeps */
// manager.road.js — Place roads on most direct lines between key points.
// Policy: First path from spawn → container (or container site) near each source, then other links.
// Lightweight: lay at most one site per tick per room.
const Log = require('util.logger').withTag('roads');
const G = require('helper.guidance');

function diamondRingOffsets(r) {
    /** @type {[number, number][]} */
    const out = [];
    for (let dx = -r; dx <= r; dx++) {
        const dy = r - Math.abs(dx);
        if (dy === 0) out.push([dx, 0]);
        else {
            out.push([dx, dy], [dx, -dy]);
        }
    }
    return out;
}

function plannedExtensionSetForRoom(room) {
    // Reserve all tiles our extension planner will eventually take: diamond rings r=2,4,6,...
    // We target the maximum extensions (RCL 8), so roads avoid long-term build tiles.
    const allowedMax = (CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION] || {})[8] || 60;
    const set = new Set();
    const terrain = room.getTerrain();
    const spawns = room.find(FIND_MY_SPAWNS) || [];
    for (const spawn of spawns) {
        let need = allowedMax;
        for (let r = 2; need > 0 && r <= 30; r += 2) {
            const offs = diamondRingOffsets(r);
            for (const [dx, dy] of offs) {
                const x = spawn.pos.x + dx;
                const y = spawn.pos.y + dy;
                if (x < 1 || y < 1 || x > 48 || y > 48) continue;
                if (terrain.get(x, y) & TERRAIN_MASK_WALL) continue;
                set.add(x + ',' + y);
                need--;
                if (need <= 0) break;
            }
        }
    }
    return set;
}

function line(room, from, to, reservedSet) {
    const path = PathFinder.search(
        from.pos || from,
        { pos: to.pos || to, range: 1 },
        {
            roomCallback(roomName) {
                // Only customize for the active room; others get default behavior
                if (roomName !== room.name) return new PathFinder.CostMatrix();
                const cm = new PathFinder.CostMatrix();
                if (reservedSet && reservedSet.size) {
                    for (const key of reservedSet) {
                        const [xs, ys] = key.split(',');
                        const x = xs | 0;
                        const y = ys | 0;
                        cm.set(x, y, 0xff); // make extension-reserved tiles impassable
                    }
                }
                return cm;
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
    // Precompute reserved extension tiles for this room so roads avoid them
    const reserved = plannedExtensionSetForRoom(room);
    // Key anchors
        const sources = room.find(FIND_SOURCES);
        const ctl = room.controller;
        // Try one placement per tick to keep cheap
        // 1) spawn <-> container (or container site) adjacent to each source; fallback to source if none
        for (const src of sources) {
            // Prefer a built container; otherwise a container construction site; else the source itself
            const cont = src.pos.findInRange(FIND_STRUCTURES, 1, {
                filter: (s) => s.structureType === STRUCTURE_CONTAINER,
            })[0];
            const contSite = src.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
                filter: (c) => c.structureType === STRUCTURE_CONTAINER,
            })[0];
            const anchor = (cont && cont.pos) || (contSite && contSite.pos) || src.pos;
            const path = line(room, spawn, anchor, reserved);
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
                                link: cont || contSite ? 'spawn↔container' : 'spawn↔src',
                            }
                        )
                    );
                    return; // one per tick
                }
            }
        }
        // 2) spawn <-> controller
        if (ctl) {
            const path = line(room, spawn, ctl, reserved);
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
    }
};
