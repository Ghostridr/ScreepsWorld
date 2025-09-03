/* eslint-env screeps */
const Log = require('util.logger').withTag('harvester');
const G = require('helper.guidance');
const Say = require('service.say');
const Paths = require('config.paths');
const Sources = require('service.sources');
const Threat = require('service.auto.detect');
var roleHarvester = {
    /** @param {Creep} creep **/
    run: function (creep) {
        if (creep.store.getFreeCapacity() > 0) {
            // Prefer withdrawing from nearby containers at sources to reduce drop loss
            const cont = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: (s) =>
                    s.structureType === STRUCTURE_CONTAINER &&
                    s.store[RESOURCE_ENERGY] > 0 &&
                    !Threat.isDanger(s.pos, creep.room.name),
            });

            // Withdraw from containers if possible, else harvest from a distributed source
            if (cont && creep.withdraw(cont, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                Say.changed(creep, 'WITHDRAW');
                Log.onChange(
                    `harvester.mode.${creep.room.name}.${creep.name}`,
                    'withdraw',
                    G.info(
                        `${creep.name} withdrawing energy from container`,
                        [
                            'Keep containers near sources stocked (miner+hauler).',
                            'Lay roads to reduce travel time.',
                        ],
                        { file: 'role.harvester.js', room: creep.room.name, creep: creep.name },
                        'HARV_WITHDRAW'
                    ),
                    'debug'
                );
                creep.moveTo(cont, { visualizePathStyle: Paths.roles.harvester.withdraw });
            } else {
                const sid = Sources.closestSourceId(creep);
                const src = sid ? Game.getObjectById(sid) : null;
                Say.changed(creep, 'HARVEST');
                Log.onChange(
                    `harvester.mode.${creep.room.name}.${creep.name}`,
                    'harvest',
                    G.info(
                        `${creep.name} harvesting directly from source`,
                        [
                            'Place containers by sources to enable withdrawals.',
                            'Use a static miner for steady supply.',
                        ],
                        { file: 'role.harvester.js', room: creep.room.name, creep: creep.name },
                        'HARV_HARVEST'
                    ),
                    'debug'
                );
                if (src && Threat.isDanger(src.pos, creep.room.name)) {
                    Say.changed(creep, 'BLOCKED');
                } else if (src && creep.harvest(src) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(src, { visualizePathStyle: Paths.roles.harvester.harvest });
                }
            }
        } else {
            // If full, transfer energy to nearby structures
            var targets = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return (
                        (structure.structureType === STRUCTURE_EXTENSION ||
                            structure.structureType === STRUCTURE_SPAWN ||
                            structure.structureType === STRUCTURE_TOWER) &&
                        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0 &&
                        !Threat.isDanger(structure.pos, creep.room.name)
                    );
                },
            });

            // Transfer energy to the first available target
            if (targets.length > 0) {
                Say.changed(creep, 'TRANSFER');
                if (creep.transfer(targets[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(targets[0], {
                        visualizePathStyle: Paths.roles.harvester.deliver,
                    });
                }
            } else {
                Log.onChange(
                    `harvester.noSinks.${creep.room.name}`,
                    'none',
                    G.warn(
                        `No eligible energy sinks in ${creep.room.name}`,
                        [
                            'Build/repair extensions, spawn, or tower.',
                            'If all full, upgrade controller or build roads.',
                        ],
                        { file: 'role.harvester.js', room: creep.room.name },
                        'NO_SINKS'
                    ),
                    'warn'
                );
            }
        }
        Say.funny(creep);
        Say.funnyLong(creep);
    },
};

module.exports = roleHarvester;
