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

        // Compact, path-friendly offsets around spawn (ring first, then diagonals)
        const deltas = [
            [0, -1],
            [1, 0],
            [0, 1],
            [-1, 0],
            [1, -1],
            [-1, -1],
            [1, 1],
            [-1, 1],
            [2, 0],
            [0, 2],
            [-2, 0],
            [0, -2],
        ];

        for (const [dx, dy] of deltas) {
            if (!need) break;
            const x = spawn.pos.x + dx;
            const y = spawn.pos.y + dy;
            if (x < 1 || y < 1 || x > 48 || y > 48) continue;
            if (room.lookForAt(LOOK_STRUCTURES, x, y).length) continue;
            if (room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y).length) continue;
            if (room.createConstructionSite(x, y, STRUCTURE_EXTENSION) === OK) {
                need--;
                Log.debug(`site at ${x},${y}`);
            }
        }
    }
};
