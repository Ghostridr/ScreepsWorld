/* eslint-env screeps */
// Static miner: parks on its container and never walks otherwise.
// Expects creep.memory.srcId and containerId to be set when spawned or on first run.
const Log = require('util.logger').withTag('miner');
const G = require('helper.guidance');
const Say = require('behavior.say');
const Paths = require('config.paths');
const Pathing = require('behavior.pathing');
const Sources = require('behavior.sources');
const Mapper = require('util.mapper');
const Cache = require('util.caching');
console.log('miner.js Mapper loaded:', typeof Mapper);
console.log('miner.js Cache loaded:', typeof Cache);
const Threat = require('service.auto.detect');

module.exports = {
    run(creep) {
        let src = Game.getObjectById(creep.memory.srcId);
        let box = Game.getObjectById(creep.memory.containerId);

        // If no source yet, take a bare assignment by spawn-order policy
        if (!src) {
            const bare = Sources.claimBare(creep.room.name, creep.name);
            if (bare && bare.sourceId) {
                creep.memory.srcId = bare.sourceId;
                src = Game.getObjectById(bare.sourceId);
                Say.once(creep, 'MINE');
            } else {
                // No assignment yet; idle
                Say.changed(creep, 'IDLE');
                return;
            }
        }
        if (!src) return; // no source yet

        // If no assigned/sensed container: try to claim the nearest safe seat; else operate bare.
        if (!box) {
            // First, try to claim nearest safe free container seat (skip threatened locations)
            const seat = Sources.findAndClaimNearestFreeSeatSafe(
                creep.room.name,
                creep.name,
                creep.pos
            );
            if (seat && seat.containerId) {
                creep.memory.srcId = seat.sourceId;
                creep.memory.containerId = seat.containerId;
                src = Game.getObjectById(seat.sourceId) || src;
                box = Game.getObjectById(seat.containerId);
            }
            // If a container has appeared next to the source, adopt it seamlessly
            const near = src.pos.findInRange(FIND_STRUCTURES, 1, {
                filter: (s) => s.structureType === STRUCTURE_CONTAINER,
            });
            if (near && near.length) {
                // Adopt only a container adjacent to THIS source; claim the specific seat
                const claimed = Sources.claimSpecificSeat(creep.room.name, creep.name, near[0].id);
                if (claimed) {
                    creep.memory.srcId = claimed.sourceId;
                    creep.memory.containerId = claimed.containerId;
                    src = Game.getObjectById(claimed.sourceId);
                    box = Game.getObjectById(claimed.containerId);
                } else {
                    // Fallback if claim fails (e.g., race): still remember local box for now
                    creep.memory.containerId = near[0].id;
                    box = near[0];
                }
            }

            if (!box) {
                if (creep.store.getFreeCapacity() > 0) {
                    // Move within harvest range and mine
                    if (Threat.isDanger(src.pos, creep.room.name)) {
                        Say.changed(creep, 'BLOCKED');
                        return;
                    }
                    if (creep.pos.getRangeTo(src) > 1) {
                        Say.changed(creep, 'MOVE');
                        Pathing.step(creep, src, {
                            visualize: false,
                            style: Paths.roles.miner.move,
                        });
                        return;
                    }
                    Say.every(creep, 'MINE', 50);
                    creep.harvest(src);
                } else {
                    // Full: deliver to spawn first, then extensions; else drop
                    const sp = creep.pos.findClosestByPath(FIND_MY_SPAWNS);
                    if (sp && sp.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                        if (creep.transfer(sp, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                            Pathing.step(creep, sp, {
                                visualize: false,
                                style: Paths.roles.miner.move,
                            });
                        }
                        return;
                    }
                    const exts = creep.room.find(FIND_STRUCTURES, {
                        filter: function (s) {
                            return (
                                s.structureType === STRUCTURE_EXTENSION &&
                                s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                            );
                        },
                    });
                    if (exts.length) {
                        const tgt = creep.pos.findClosestByPath(exts);
                        if (creep.transfer(tgt, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                            Pathing.step(creep, tgt, {
                                visualize: false,
                                style: Paths.roles.miner.move,
                            });
                        }
                        return;
                    }
                    creep.drop(RESOURCE_ENERGY);
                }
                Say.funny(creep);
                Say.funnyLong(creep);
                return;
            }
        }

        if (!creep.pos.isEqualTo(box.pos)) {
            Say.changed(creep, 'MOVE');
            Pathing.step(creep, box, { visualize: false, style: Paths.roles.miner.move });
            return;
        }
        // Harvest continuously; dump into container each tick.
        Say.every(creep, 'MINE', 50);
        creep.harvest(src);
        if (creep.store[RESOURCE_ENERGY] > 0) {
            Say.changed(creep, 'TRANSFER');
            creep.transfer(box, RESOURCE_ENERGY);
        }
        // Rare change-driven tip log to mark seating on container; exercises Log and G
        Log.onChange(
            `miner.seated.${creep.room.name}.${creep.name}`,
            creep.pos.isEqualTo(box.pos) ? 'SEATED' : 'MOVING',
            G.info(
                `${creep.name} ${creep.pos.isEqualTo(box.pos) ? 'seated' : 'moving to seat'}`,
                ['A static miner should not walk while mining; ensure a nearby container.'],
                { file: 'role.miner.js', room: creep.room.name, creep: creep.name },
                'MINER_SEAT'
            ),
            'debug'
        );
        Say.funny(creep);
        Say.funnyLong(creep);
    },
};
