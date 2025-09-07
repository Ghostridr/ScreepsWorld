/* eslint-env screeps */
// manager.road.js — Place roads on most direct lines between key points.
// Early-game mode: place one site per edge per tick (spawn↔each source, spawn↔controller, spawn↔minerals).
const Log = require('util.logger').withTag('roads');
const G = require('helper.guidance');
Log.info('road.js Log loaded:', typeof Log);
console.log('road.js G loaded:', typeof G);

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
    // Reserve all tiles our extension planner will eventually take
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
                        cm.set(x, y, 50); // discourage roads, but allow creeps if no other way
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
        const minerals = room.find ? room.find(FIND_MINERALS) : [];
        // Placement cap (adjustable): default generous; clamp to 50
        const mem = Memory.rooms[room.name] || (Memory.rooms[room.name] = {});
        const plannerMem = mem.roadPlanner || (mem.roadPlanner = {});
        const maxPerTick = Math.min(200, Math.max(1, plannerMem.maxPerTick || 50)); // allow higher ceiling
        let placedThisTick = 0;

        const PLANNED_EXPORT_BUDGET = 15; // max new planned tiles recorded per room per tick
        let plannedExported = 0;

        function exportPlanned(route, budget) {
            if (!route || !route.length || budget <= 0) return 0;
            const mem = Memory.rooms[room.name] || (Memory.rooms[room.name] = {});
            const list = mem.plannedRoads || (mem.plannedRoads = []);
            const CAP = 600; // soft cap; trim oldest when exceeded
            let added = 0;
            for (const p of route) {
                if (added >= budget) break;
                if (p.x < 1 || p.y < 1 || p.x > 48 || p.y > 48) continue;
                const key = p.x + ',' + p.y;
                if (list.includes(key)) continue;
                // Skip if already built / has road site
                if (
                    room
                        .lookForAt(LOOK_STRUCTURES, p.x, p.y)
                        .some((s) => s.structureType === STRUCTURE_ROAD)
                )
                    continue;
                if (
                    room
                        .lookForAt(LOOK_CONSTRUCTION_SITES, p.x, p.y)
                        .some((c) => c.structureType === STRUCTURE_ROAD)
                )
                    continue;
                list.push(key);
                added++;
            }
            // Prune entries that are now real roads (cheap linear scan; early game sizes small)
            if (list.length) {
                mem.plannedRoads = list.filter((k) => {
                    const [xs, ys] = k.split(',');
                    const x = xs | 0,
                        y = ys | 0;
                    return !room
                        .lookForAt(LOOK_STRUCTURES, x, y)
                        .some((s) => s.structureType === STRUCTURE_ROAD);
                });
            }
            // Enforce cap
            if (mem.plannedRoads.length > CAP)
                mem.plannedRoads.splice(0, mem.plannedRoads.length - CAP);
            return added;
        }

        function placeNextAlong(a, b, label) {
            if (placedThisTick >= maxPerTick) return 0;
            const route = line(room, a, b, reserved);
            // Auto-export planned road tiles (budgeted) so movement can bias early
            if (plannedExported < PLANNED_EXPORT_BUDGET) {
                plannedExported += exportPlanned(route, PLANNED_EXPORT_BUDGET - plannedExported);
            }
            // Find the first tile along the path that does not yet have a road or site and place one
            for (const p of route) {
                if (placedThisTick >= maxPerTick) break;
                const res = placeRoadAt(room, p);
                if (res === OK) {
                    require('util.logger').construction.record(room.name, 'road', p.x, p.y, {
                        link: label,
                        placed: true,
                    });
                    placedThisTick++;
                    return 1; // one placement for this route this tick
                }
            }
            return 0;
        }

        // 1) Each source progresses this tick
        // Progress all routes in the same tick (one new road per route if capacity)
        if (sources && sources.length) {
            for (const src of sources) {
                if (placedThisTick >= maxPerTick) break;
                const cont = src.pos.findInRange(FIND_STRUCTURES, 1, {
                    filter: (s) => s.structureType === STRUCTURE_CONTAINER,
                })[0];
                const contSite = src.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
                    filter: (c) => c.structureType === STRUCTURE_CONTAINER,
                })[0];
                const anchor = (cont && cont.pos) || (contSite && contSite.pos) || src.pos;
                placeNextAlong(spawn, anchor, cont || contSite ? 'spawn↔container' : 'spawn↔src');
            }
        }
        if (ctl && placedThisTick < maxPerTick) {
            placeNextAlong(spawn, ctl, 'spawn↔ctl');
        }
        if (minerals && minerals.length) {
            for (const m of minerals) {
                if (placedThisTick >= maxPerTick) break;
                const ex = m.pos
                    .lookFor(LOOK_STRUCTURES)
                    .find((s) => s.structureType === STRUCTURE_EXTRACTOR);
                const anchor = (ex && ex.pos) || m.pos;
                placeNextAlong(spawn, anchor, 'spawn↔mineral');
            }
        }
    }
};
