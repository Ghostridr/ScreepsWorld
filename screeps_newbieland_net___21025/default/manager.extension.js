/* eslint-env screeps */
// Auto-place extension sites in a tight cluster around each spawn when RCL allows.
// Places only up to the allowed count and avoids duplicates.
const Log = require('util.logger').withTag('ext');
module.exports.loop = function () {
    for (const spawnName in Game.spawns) {
        const spawn = Game.spawns[spawnName];
        const room = spawn.room;
        const rcl = room.controller.level || 0;

        // How many are allowed vs already present/pending
        const allowed = CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][rcl] || 0;
        if (allowed === 0) continue; // not unlocked yet
        const built = room.find(FIND_STRUCTURES, {
            filter: (s) => s.structureType === STRUCTURE_EXTENSION,
        }).length;
        const sites = room.find(FIND_CONSTRUCTION_SITES, {
            filter: (c) => c.structureType === STRUCTURE_EXTENSION,
        }).length;
        let need = Math.max(0, allowed - built - sites);
        if (!need) continue;

        const G = require('helper.guidance');
        Log.onChange(
            `ext.plan.${room.name}`,
            { need, built, sites, allowed },
            (v) =>
                G.info(
                    null,
                    null,
                    { file: 'manager.extension.js', room: room.name },
                    'EXT_PLAN',
                    v
                ),
            'info'
        );

        // Generate DIAMOND (Manhattan) rings with a one-tile walkway between spawn and rings,
        // and between rings: r = 2, 4, 6, ... where |dx|+|dy| == r. Ordered clockwise starting SOUTH;
        // even-indexed rings are staggered by 22.5° to reduce alignment artifacts.
        const terrain = room.getTerrain();
        for (let ringIdx = 0; need > 0 && ringIdx < 6; ringIdx++) {
            const r = 2 + ringIdx * 2; // 2,4,6,... ensures a 1-tile walkway around spawn and between rings
            /** @type {[number, number][]} */
            const offsets = [];
            // Manhattan perimeter: |dx| + |dy| == r
            for (let dx = -r; dx <= r; dx++) {
                const dy = r - Math.abs(dx);
                if (dy === 0) {
                    offsets.push([dx, 0]);
                } else {
                    offsets.push([dx, dy], [dx, -dy]);
                }
            }
            // Sort clockwise starting SOUTH (below spawn). Stagger alternating rings by 22.5°.
            const angleOffset = ringIdx % 2 === 1 ? Math.PI / 8 : 0; // 22.5°
            offsets.sort((a, b) => {
                const angA = (Math.atan2(a[0], a[1]) - angleOffset + Math.PI * 2) % (Math.PI * 2);
                const angB = (Math.atan2(b[0], b[1]) - angleOffset + Math.PI * 2) % (Math.PI * 2);
                return angA - angB;
            });

            for (const [dx, dy] of offsets) {
                if (!need) break;
                const x = spawn.pos.x + dx;
                const y = spawn.pos.y + dy;
                if (x < 1 || y < 1 || x > 48 || y > 48) continue;
                if (terrain.get(x, y) & TERRAIN_MASK_WALL) continue;
                if (room.lookForAt(LOOK_STRUCTURES, x, y).length) continue;
                if (room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y).length) continue;
                if (room.createConstructionSite(x, y, STRUCTURE_EXTENSION) === OK) {
                    need--;
                    Log.debug(`site at ${x},${y}`);
                }
            }
        }
    }
};
