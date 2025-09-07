/* eslint-env screeps */
// Auto-place extension sites as SQUARE rings (Chebyshev distance) around each spawn.
// Keep a 1-tile buffer around the spawn for spawning and a 1-tile walkway between rings.
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

        // Generate SQUARE rings: r = 2, 4, 6, ... where max(|dx|,|dy|) == r.
        // r starts at 2 to preserve a 1-tile buffer around the spawn, and increments by 2 to
        // keep a walkway between rings. Ordered clockwise starting SOUTH; alternate rings staggered.
        const terrain = room.getTerrain();
        function chebyshevRingOffsets(r, angleOffsetRad) {
            /** @type {[number, number][]} */
            const offs = [];
            for (let dx = -r; dx <= r; dx++) {
                offs.push([dx, r]);
                offs.push([dx, -r]);
            }
            for (let dy = -r + 1; dy <= r - 1; dy++) {
                offs.push([r, dy]);
                offs.push([-r, dy]);
            }
            const angleOffset = angleOffsetRad || 0;
            offs.sort((a, b) => {
                const angA = (Math.atan2(a[0], a[1]) - angleOffset + Math.PI * 2) % (Math.PI * 2);
                const angB = (Math.atan2(b[0], b[1]) - angleOffset + Math.PI * 2) % (Math.PI * 2);
                return angA - angB;
            });
            return offs;
        }

        for (let ringIdx = 0; need > 0 && ringIdx < 12; ringIdx++) {
            const r = 2 + ringIdx * 2; // 2,4,6,...
            const offsets = chebyshevRingOffsets(r, ringIdx % 2 === 1 ? Math.PI / 8 : 0);
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
                    require('util.logger').construction.record(room.name, 'extension', x, y, {
                        placed: true,
                    });
                }
            }
        }
    }
};
