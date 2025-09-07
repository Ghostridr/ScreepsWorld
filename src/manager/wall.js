/* eslint-env screeps */
// manager.wall.js — Plan ramparts as concentric rings around the spawn with 1‑tile walkways,
// matching the extension ring layout. Planning is based only on RCL (outer radius follows
// how many extension rings are needed at the current RCL). Ramparts themselves have no cap;
// we simply attempt to place them and let the game rules accept/reject per RCL.

const Log = require('util.logger').withTag('walls');
const G = require('helper.guidance');
Log.info('wall.js Log loaded:', typeof Log);
console.log('wall.js G loaded:', typeof G);

function placeRampartIfFree(room, x, y) {
    if (x < 1 || y < 1 || x > 48 || y > 48) return ERR_INVALID_TARGET;
    if (room.getTerrain().get(x, y) === TERRAIN_MASK_WALL) return ERR_INVALID_TARGET;
    // Skip if rampart already exists or site already there
    const structs = room.lookForAt(LOOK_STRUCTURES, x, y);
    if (structs.some((s) => s.structureType === STRUCTURE_RAMPART)) return ERR_FULL;
    if (room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y).length) return ERR_FULL;
    return room.createConstructionSite(x, y, STRUCTURE_RAMPART);
}

function chebyshevRingOffsets(r, angleOffsetRad = 0) {
    // Perimeter of a square ring at Chebyshev distance r. Sorted clockwise starting SOUTH.
    /** @type {[number, number][]} */
    const offsets = [];
    for (let dx = -r; dx <= r; dx++) {
        offsets.push([dx, r]);
        offsets.push([dx, -r]);
    }
    for (let dy = -r + 1; dy <= r - 1; dy++) {
        offsets.push([r, dy]);
        offsets.push([-r, dy]);
    }
    offsets.sort((a, b) => {
        const aAng = (Math.atan2(a[0], a[1]) - angleOffsetRad + Math.PI * 2) % (Math.PI * 2);
        const bAng = (Math.atan2(b[0], b[1]) - angleOffsetRad + Math.PI * 2) % (Math.PI * 2);
        return aAng - bAng;
    });
    return offsets;
}

function outerExtensionRadiusForRCL(rcl) {
    const allowed = CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][rcl] || 0;
    if (!allowed) return 1; // still put the inner ring of ramparts when nothing else
    let need = allowed;
    let r = 2; // first extension ring at distance 2
    while (need > 0 && r <= 20) {
        const capacity = 8 * r; // ring size for Chebyshev perimeter
        need -= capacity;
        if (need > 0) r += 2;
    }
    return r; // radius of the outermost extension ring for this RCL
}

module.exports.loop = function () {
    for (const name in Game.spawns) {
        const spawn = Game.spawns[name];
        const room = spawn.room;
        const rcl = (room.controller && room.controller.level) || 0;

        // Determine how far extensions should reach, then set ramparts to odd rings up to +1 beyond.
        const outerExtR = outerExtensionRadiusForRCL(rcl);
        const maxRampR = Math.min(24, outerExtR + 1); // stay inside room edges comfortably

        // Planner memory & boost support
        const mem = Memory.rooms[room.name] || (Memory.rooms[room.name] = {});
        const rampMem = mem.rampartPlanner || (mem.rampartPlanner = {});
        const boost = !!rampMem.boost;
        const MAX_PER_TICK = Math.min(200, Math.max(1, rampMem.maxPerTick || (boost ? 40 : 8)));
        const perRingBatch = Math.min(20, Math.max(1, rampMem.perRingBatch || (boost ? 3 : 1)));
        let placed = 0;
        const ringProgress = rampMem.ringProgress || (rampMem.ringProgress = {});

        for (let r = 1, idx = 0; r <= maxRampR && placed < MAX_PER_TICK; r += 2, idx++) {
            const angleOffset = idx % 2 === 1 ? Math.PI / 8 : 0; // stagger like extensions
            const offs = chebyshevRingOffsets(r, angleOffset);
            let progressIdx = ringProgress[r] || 0;
            let inspected = 0;
            let placedThisRing = 0;
            while (
                placed < MAX_PER_TICK &&
                placedThisRing < perRingBatch &&
                inspected < offs.length
            ) {
                const [dx, dy] = offs[progressIdx];
                const x = spawn.pos.x + dx;
                const y = spawn.pos.y + dy;
                const res = placeRampartIfFree(room, x, y);
                if (res === OK) {
                    placed++;
                    placedThisRing++;
                    require('util.logger').construction.record(room.name, 'rampart', x, y, {
                        r,
                        placed: true,
                    });
                }
                progressIdx = (progressIdx + 1) % offs.length;
                inspected++;
            }
            ringProgress[r] = progressIdx;
        }

        // Idle detection for auto disabling boost once most rings have no free tiles
        if (placed === 0) {
            rampMem.idleTicks = (rampMem.idleTicks || 0) + 1;
        } else {
            rampMem.idleTicks = 0;
        }
        if (!rampMem.layoutComplete && rampMem.idleTicks >= 200) {
            rampMem.layoutComplete = true;
            if (rampMem.autoDisableBoost !== false) rampMem.boost = false;
        }
    }
};
