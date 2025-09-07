/* eslint-env screeps */
const Log = require('util.logger').withTag('harvester');
const G = require('helper.guidance');
const Say = require('behavior.say');
const Paths = require('config.paths');
const Pathing = require('behavior.pathing');
const Sources = require('behavior.sources');
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
                Pathing.step(creep, cont, {
                    visualize: false,
                    style: Paths.roles.harvester.withdraw,
                });
            } else {
                // Threat-aware source selection with fallback to next nearest when blocked
                const room = creep.room;
                let acted = false;

                // First, try service.sources for a cheap, cached-ish pick
                const srcId =
                    Sources && Sources.closestSourceId ? Sources.closestSourceId(creep) : null;
                if (srcId) {
                    const src = Game.getObjectById(srcId);
                    if (src && !Threat.isDanger(src.pos, room.name)) {
                        Say.changed(creep, 'HARVEST');
                        Log.onChange(
                            `harvester.mode.${creep.room.name}.${creep.name}`,
                            'harvest',
                            G.info(
                                `${creep.name} harvesting via Sources.closestSourceId`,
                                [
                                    'Place containers by sources to enable withdrawals.',
                                    'Use a static miner for steady supply.',
                                ],
                                {
                                    file: 'role.harvester.js',
                                    room: creep.room.name,
                                    creep: creep.name,
                                },
                                'HARV_HARVEST'
                            ),
                            'debug'
                        );
                        const res = creep.harvest(src);
                        if (res === OK) {
                            acted = true;
                        } else if (res === ERR_NOT_IN_RANGE) {
                            const mv = Pathing.step(creep, src, {
                                visualize: false,
                                style: Paths.roles.harvester.harvest,
                            });
                            if (mv === OK) acted = true;
                        }
                    }
                }

                // Fallback to manual nearest-safe scan
                const all = room.find(FIND_SOURCES) || [];
                // Order by range to creep; prefer sources with energy > 0
                const safe = all
                    .filter((s) => !Threat.isDanger(s.pos, room.name))
                    .sort((a, b) => creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b));
                const lists = [safe.filter((s) => s.energy > 0), safe];
                for (const list of lists) {
                    if (acted) break;
                    for (const src of list) {
                        if (!src) continue;
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
                                {
                                    file: 'role.harvester.js',
                                    room: creep.room.name,
                                    creep: creep.name,
                                },
                                'HARV_HARVEST'
                            ),
                            'debug'
                        );
                        const res = creep.harvest(src);
                        if (res === OK) {
                            acted = true;
                            break;
                        }
                        if (res === ERR_NOT_IN_RANGE) {
                            const mv = Pathing.step(creep, src, {
                                visualize: false,
                                style: Paths.roles.harvester.harvest,
                            });
                            if (mv === OK) {
                                acted = true; // started moving
                                break;
                            }
                            // else, try next nearest
                            continue;
                        }
                        if (res === ERR_INVALID_TARGET) {
                            continue;
                        }
                    }
                }
                if (!acted) {
                    // No safe source reachable → back off (idle briefly)
                    Say.changed(creep, 'BLOCKED');
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
                    Pathing.step(creep, targets[0], {
                        visualize: false,
                        style: Paths.roles.harvester.deliver,
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
