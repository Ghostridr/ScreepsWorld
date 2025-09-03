/* eslint-env screeps */
// manager.tower.js — Single owner of tower actions per tick.
const Log = require('util.logger').withTag('tower');
const Repair = require('service.repair');
const G = require('helper.guidance');

module.exports.loop = function () {
    const towers = _.filter(Game.structures, (s) => s.structureType === STRUCTURE_TOWER && s.my);
    if (!towers.length) return;
    // Overlapping coverage emerges naturally by iterating all towers each tick.
    for (const tower of towers) {
        // 1) Attack hostiles
        const hostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        if (hostile) {
            tower.attack(hostile);
            continue;
        }
        // 2) Heal friendlies (closest injured in same room)
        const injured = tower.room.find(FIND_MY_CREEPS, { filter: (c) => c.hits < c.hitsMax });
        if (injured && injured.length) {
            let closest = injured[0];
            let best = tower.pos.getRangeTo(closest);
            for (let i = 1; i < injured.length; i++) {
                const d = tower.pos.getRangeTo(injured[i]);
                if (d < best) {
                    best = d;
                    closest = injured[i];
                }
            }
            tower.heal(closest);
            continue;
        }
        // 3) Repair according to service policy
        const target = Repair.pickTargetForTower(tower);
        if (target) tower.repair(target);
    }
    Log.onChange(
        'tower.count',
        towers.length,
        (n) =>
            G.info(
                null,
                null,
                { file: 'manager.tower.js', room: towers[0].room.name },
                'TOWER_COUNT',
                { count: n }
            ),
        'info'
    );
};
