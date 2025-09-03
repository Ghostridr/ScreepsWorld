/* eslint-env screeps */
// manager.wall.js — Plan ramparts as concentric rings around the spawn with 1‑tile walkways,
// matching the extension ring layout. Planning is based only on RCL (outer radius follows
// how many extension rings are needed at the current RCL). Ramparts themselves have no cap;
// we simply attempt to place them and let the game rules accept/reject per RCL.

const Log = require('util.logger').withTag('walls');
const G = require('helper.guidance');

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

        // Place a few rampart sites per tick to avoid CPU spikes
        const MAX_PER_TICK = 2;
        let placed = 0;

        for (let r = 1, idx = 0; r <= maxRampR && placed < MAX_PER_TICK; r += 2, idx++) {
            const angleOffset = idx % 2 === 1 ? Math.PI / 8 : 0; // stagger like extensions
            const offs = chebyshevRingOffsets(r, angleOffset);
            for (const [dx, dy] of offs) {
                if (placed >= MAX_PER_TICK) break;
                const x = spawn.pos.x + dx;
                const y = spawn.pos.y + dy;
                const res = placeRampartIfFree(room, x, y);
                if (res === OK) {
                    placed++;
                    Log.info(
                        G.info(
                            null,
                            null,
                            { file: 'manager.wall.js', room: room.name },
                            'RAMPART_SITE_RING',
                            { x, y, r }
                        )
                    );
                }
            }
        }
    }
};
