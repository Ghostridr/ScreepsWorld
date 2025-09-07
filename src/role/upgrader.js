const Log = require('util.logger').withTag('upgrader');
const G = require('helper.guidance');
const Say = require('service.say');
const Paths = require('config.paths');
const Pathing = require('service.pathing');
const Sources = require('service.sources');
const Mapper = require('util.mapper');
const Cache = require('util.caching');
console.log('upgrader.js Mapper loaded:', typeof Mapper);
console.log('upgrader.js Cache loaded:', typeof Cache);
const Threat = require('service.auto.detect');

var roleUpgrader = {
    /** @param {Creep} creep **/
    run: function (creep) {
        if (creep.memory.upgrading && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.upgrading = false;
            Say.say(creep, 'HARVEST');
        }
        if (!creep.memory.upgrading && creep.store.getFreeCapacity() === 0) {
            creep.memory.upgrading = true;
            Say.say(creep, 'UPG');
        }

        if (creep.memory.upgrading) {
            Log.onChange(
                `upgrader.state.${creep.room.name}.${creep.name}`,
                'upgrade',
                G.info(
                    `${creep.name} upgrading controller`,
                    [
                        'Keep steady energy flow via container/link near controller.',
                        'Throttle upgrader count if tower/extensions starve.',
                    ],
                    { file: 'role.upgrader.js', room: creep.room.name, creep: creep.name },
                    'UPGR_UPGRADE'
                ),
                'debug'
            );
            // Speak hammer with controller progress percent (changes only when pct changes)
            var ctrl = creep.room && creep.room.controller;
            if (ctrl && typeof ctrl.progressTotal === 'number' && ctrl.progressTotal > 0) {
                var pct = Math.max(
                    0,
                    Math.min(100, Math.round((ctrl.progress * 100) / ctrl.progressTotal))
                );
                Say.changed(creep, 'UPG', { pct: pct });
            } else {
                // At RCL8 or missing totals, just show hammer
                Say.changed(creep, 'UPG');
            }
            if (Threat.isDanger(creep.room.controller.pos, creep.room.name)) {
                Say.changed(creep, 'BLOCKED');
            } else if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
                Pathing.step(creep, creep.room.controller, {
                    visualize: false,
                    style: Paths.roles.upgrader.upgrade,
                });
            }
        } else {
            Log.onChange(
                `upgrader.state.${creep.room.name}.${creep.name}`,
                'harvest',
                G.info(
                    `${creep.name} gathering energy`,
                    [
                        'Prefer withdrawing from containers to reduce movement.',
                        'Add roads between sources and controller early.',
                    ],
                    { file: 'role.upgrader.js', room: creep.room.name, creep: creep.name },
                    'UPGR_HARVEST'
                ),
                'debug'
            );
            const sid = Sources.closestSourceId(creep);
            const src = sid ? Game.getObjectById(sid) : null;
            if (src && Threat.isDanger(src.pos, creep.room.name)) {
                Say.changed(creep, 'BLOCKED');
            } else if (src && creep.harvest(src) === ERR_NOT_IN_RANGE) {
                Pathing.step(creep, src, { visualize: false, style: Paths.roles.upgrader.harvest });
            }
        }
        // Rare, change-driven tip log to mark state; uses Log and G without spam
        Log.onChange(
            `upgrader.phase.${creep.room.name}.${creep.name}`,
            creep.memory.upgrading ? 'UPGRADING' : 'GATHERING',
            G.info(
                `${creep.name} ${creep.memory.upgrading ? 'upgrading' : 'gathering'}`,
                ['Ensure a steady flow via container/link near controller.'],
                { file: 'role.upgrader.js', room: creep.room.name, creep: creep.name },
                'UPGR_STATE'
            ),
            'debug'
        );
        Say.funny(creep);
        Say.funnyLong(creep);
    },
};

module.exports = roleUpgrader;
