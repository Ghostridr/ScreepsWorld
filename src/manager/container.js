/* eslint-env screeps */
// Auto-place one container next to each source if none exists yet.
// Export a loop() function to be called from main each tick (cheap check).
const Log = require('util.logger').withTag('containers');
module.exports.loop = function () {
    for (const spawnName in Game.spawns) {
        const spawn = Game.spawns[spawnName];
        const room = spawn.room;
        const terrain = room.getTerrain();
        const sources = room.find(FIND_SOURCES);

        for (const src of sources) {
            // Skip if a container or a construction site for it already exists within range 1
            const hasContainer =
                src.pos.findInRange(FIND_STRUCTURES, 1, {
                    filter: (s) => s.structureType === STRUCTURE_CONTAINER,
                }).length > 0;
            const hasSite =
                src.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
                    filter: (s) => s.structureType === STRUCTURE_CONTAINER,
                }).length > 0;
            if (hasContainer || hasSite) {
                const G = require('helper.guidance');
                Log.onChange(
                    `containers.state.${room.name}.${src.id}`,
                    hasContainer ? 'built' : 'site',
                    (v) =>
                        G.info(
                            `source ${src.id} container ${v}`,
                            [
                                v === 'site'
                                    ? 'Assign a builder to construct the site.'
                                    : 'Miners can bind; haulers can withdraw.',
                                'Ensure tile is not blocked by walls/structures.',
                            ],
                            { file: 'manager.container.js', room: room.name, source: src.id },
                            'CONT_STATE'
                        ),
                    'info'
                );
                continue;
            }

            // Try adjacent tiles; prefer non-swamp, then allow swamp if nothing else
            const tryPlace = (preferDry) => {
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        if (dx === 0 && dy === 0) continue;
                        const x = src.pos.x + dx;
                        const y = src.pos.y + dy;
                        if (x < 1 || y < 1 || x > 48 || y > 48) continue; // avoid room edges
                        const tile = terrain.get(x, y);
                        if (tile === TERRAIN_MASK_WALL) continue;
                        const isSwamp = (tile & TERRAIN_MASK_SWAMP) === TERRAIN_MASK_SWAMP;
                        if (preferDry && isSwamp) continue; // skip swamps in first pass
                        const occupied =
                            room.lookForAt(LOOK_STRUCTURES, x, y).length > 0 ||
                            room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y).length > 0;
                        if (occupied) continue;
                        const res = room.createConstructionSite(x, y, STRUCTURE_CONTAINER);
                        if (res === OK) {
                            require('util.logger').construction.record(
                                room.name,
                                'container',
                                x,
                                y,
                                { source: src.id, placed: true }
                            );
                            return true;
                        }
                    }
                }
                return false;
            };
            // Attempt placement; do not exit loop so other sources also get placed this tick
            const placedDry = tryPlace(true); // first pass: dry tiles
            if (!placedDry) {
                tryPlace(false); // fallback: allow swamps
            }
        }
    }
};
