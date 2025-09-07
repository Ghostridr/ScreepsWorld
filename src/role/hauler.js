/* eslint-env screeps */
// role.hauler.js — move energy from containers/ground to sinks (spawn/extensions/towers/storage)
const Log = require('util.logger').withTag('hauler');
const G = require('helper.guidance');
const Say = require('behavior.say');
const Paths = require('config.paths');
const Pathing = require('behavior.pathing');
const HaulQ = require('behavior.haul');
const Mapper = require('util.mapper');
const Cache = require('util.caching');
console.log('hauler.js Mapper loaded:', typeof Mapper);
console.log('hauler.js Cache loaded:', typeof Cache);
const Threat = require('service.auto.detect');

module.exports = {
    run(creep) {
        const carrying = creep.store[RESOURCE_ENERGY] > 0;
        // Try to get/continue a job
        if (!creep.memory.jobId) {
            const claim = HaulQ.claim(creep.room.name, creep.name);
            if (claim) creep.memory.jobId = claim.id;
        }
        const job = creep.memory.jobId ? HaulQ.get(creep.room.name, creep.memory.jobId) : null;

        if (job) {
            const src = Game.getObjectById(job.srcId);
            const dst = Game.getObjectById(job.dstId);
            if (!src || !dst) {
                HaulQ.release(creep.room.name, job.id, 'ABORT');
                creep.memory.jobId = null;
                return;
            }
            if (
                (src && Threat.isDanger(src.pos, creep.room.name)) ||
                (dst && Threat.isDanger(dst.pos, creep.room.name))
            ) {
                HaulQ.release(creep.room.name, job.id, 'ABORT_DANGER');
                creep.memory.jobId = null;
                Say.changed(creep, 'BLOCKED');
                return;
            }
            if (creep.store.getFreeCapacity() > 0) {
                // go to source first
                const wr = creep.withdraw(src, RESOURCE_ENERGY);
                if (wr === ERR_NOT_IN_RANGE) {
                    Pathing.step(creep, src, {
                        visualize: false,
                        style: Paths.roles.hauler.withdraw || Paths.roles.harvester.withdraw,
                    });
                } else if (wr === ERR_INVALID_TARGET || wr === ERR_NOT_ENOUGH_RESOURCES) {
                    // abort and requeue; source empty/invalid
                    HaulQ.release(creep.room.name, job.id, 'ABORT');
                    creep.memory.jobId = null;
                    return;
                }
            } else {
                const tr = creep.transfer(dst, RESOURCE_ENERGY);
                if (tr === ERR_NOT_IN_RANGE) {
                    Pathing.step(creep, dst, {
                        visualize: false,
                        style: Paths.roles.hauler.deliver || Paths.roles.harvester.deliver,
                    });
                } else if (tr === OK) {
                    // On successful transfer, clear
                    HaulQ.release(creep.room.name, job.id, 'DONE');
                    creep.memory.jobId = null;
                } else if (
                    tr === ERR_FULL ||
                    tr === ERR_INVALID_TARGET ||
                    tr === ERR_NOT_ENOUGH_RESOURCES
                ) {
                    HaulQ.release(creep.room.name, job.id, 'ABORT');
                    creep.memory.jobId = null;
                    return;
                }
            }
        } else if (carrying) {
            // Prioritize sinks: extensions/spawns/towers, then storage
            const sinksAll = creep.room.find(FIND_STRUCTURES, {
                filter: (s) =>
                    ((s.structureType === STRUCTURE_EXTENSION ||
                        s.structureType === STRUCTURE_SPAWN ||
                        s.structureType === STRUCTURE_TOWER) &&
                        s.store.getFreeCapacity(RESOURCE_ENERGY) > 0) ||
                    (s.structureType === STRUCTURE_STORAGE &&
                        s.store.getFreeCapacity(RESOURCE_ENERGY) > 0),
            });
            const sinks = sinksAll.filter((s) => !Threat.isDanger(s.pos, creep.room.name));
            if (sinks.length) {
                const target = creep.pos.findClosestByPath(sinks);
                Say.changed(creep, 'TRANSFER');
                if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    Pathing.step(creep, target, {
                        visualize: false,
                        style: Paths.roles.hauler.deliver || Paths.roles.harvester.deliver,
                    });
                }
            } else {
                // Nothing to fill; idle briefly near spawn
                Say.every(creep, 'IDLE', 50);
            }
        } else {
            // Withdraw from nearest container with energy; fallback to pickup dropped energy nearby
            const containers = creep.room.find(FIND_STRUCTURES, {
                filter: (s) =>
                    s.structureType === STRUCTURE_CONTAINER &&
                    s.store[RESOURCE_ENERGY] > 0 &&
                    !Threat.isDanger(s.pos, creep.room.name),
            });
            const container = containers.length ? creep.pos.findClosestByPath(containers) : null;
            if (container) {
                Say.changed(creep, 'WITHDRAW');
                if (creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    Pathing.step(creep, container, {
                        visualize: false,
                        style: Paths.roles.hauler.withdraw || Paths.roles.harvester.withdraw,
                    });
                }
            } else {
                const pile = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {
                    filter: (r) =>
                        r.resourceType === RESOURCE_ENERGY &&
                        r.amount >= 50 &&
                        !Threat.isDanger(r.pos, creep.room.name),
                });
                if (pile) {
                    if (creep.pickup(pile) === ERR_NOT_IN_RANGE) {
                        Pathing.step(creep, pile, {
                            visualize: false,
                            style: Paths.roles.hauler.move,
                        });
                    }
                } else {
                    // As a last resort, hover near storage/spawn
                    const hub = creep.room.storage || creep.pos.findClosestByPath(FIND_MY_SPAWNS);
                    if (hub && !Threat.isDanger(hub.pos, creep.room.name))
                        Pathing.step(creep, hub, {
                            visualize: false,
                            style: Paths.roles.hauler.move,
                        });
                    Say.every(creep, 'IDLE', 80);
                }
            }
        }
        // Guidance/logs sparingly
        const logEvery =
            typeof Log.every === 'function'
                ? Log.every.bind(Log)
                : function (n, msgOrFn, tag) {
                      if (n <= 0) return;
                      if (Game.time % n !== 0) return;
                      const m = typeof msgOrFn === 'function' ? msgOrFn() : msgOrFn;
                      Log.info(m, tag);
                  };
        logEvery(
            200,
            () =>
                G.info(
                    `${creep.name} hauling in ${creep.room.name}`,
                    [
                        'Keep one static miner per source to feed containers.',
                        'Scale hauler count/size with path length and harvest rate.',
                    ],
                    { file: 'role.hauler.js', room: creep.room.name, creep: creep.name },
                    'HAUL_TIP'
                ),
            creep.room.name
        );
        Say.funny(creep);
        Say.funnyLong(creep);
    },
};
