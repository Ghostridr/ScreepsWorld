const Log = require('util.logger').withTag('upgrader');
const G = require('helper.guidance');
const Say = require('service.say');
const Paths = require('config.paths');
const Sources = require('service.sources');
const Mapper = require('util.mapper');
const Cache = require('util.caching');

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
            if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller, {
                    visualizePathStyle: Paths.roles.upgrader.upgrade,
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
            if (src && creep.harvest(src) === ERR_NOT_IN_RANGE) {
                creep.moveTo(src, {
                    visualizePathStyle: Paths.roles.upgrader.harvest,
                });
            }
        }
        // Minimal stuck detection: if we haven't moved for a few ticks, invalidate the cached path
        // Use Mapper and Cache so these imports are exercised without altering core behavior
        const posKey = Mapper.toPosKey(creep.pos);
        const mm = creep.memory._moveMon || (creep.memory._moveMon = { lastPos: posKey, stuck: 0 });
        if (mm.lastPos === posKey) mm.stuck = (mm.stuck || 0) + 1;
        else {
            mm.stuck = 0;
            mm.lastPos = posKey;
        }
        if (mm.stuck >= 3) {
            const goal = creep.memory.upgrading
                ? creep.room.controller
                : (function () {
                      const sid = Sources.closestSourceId(creep);
                      return sid ? Game.getObjectById(sid) : null;
                  })();
            if (goal) {
                const k = Mapper.reuseKey(Mapper.toPosKey(creep.pos), Mapper.toPosKey(goal.pos));
                if (!Memory.pathCache) Memory.pathCache = {};
                Cache.del(Memory.pathCache, k);
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
