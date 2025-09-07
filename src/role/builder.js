const Log = require('util.logger').withTag('builder');
const G = require('helper.guidance');
const Say = require('behavior.say');
const Con = require('behavior.construction');
const Sources = require('behavior.sources');
const Build = require('behavior.build');
const Paths = require('config.paths');
const Pathing = require('behavior.pathing');
const Mapper = require('util.mapper');
const Cache = require('util.caching');
console.log('builder.js Mapper loaded:', typeof Mapper);
console.log('builder.js Cache loaded:', typeof Cache);
const Threat = require('service.auto.detect');
var roleBuilder = {
    /** @param {Creep} creep **/
    run: function (creep) {
        if (creep.memory.building && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.building = false;
            Say.say(creep, 'HARVEST');
        }
        if (!creep.memory.building && creep.store.getFreeCapacity() === 0) {
            creep.memory.building = true;
            Say.say(creep, 'BUILD');
        }

        if (creep.memory.building) {
            // If we already own an exclusive site, stick to it; else pick next best not owned by others
            let target = null;
            const claimedId = Build.claimedSiteId(creep.room.name, creep.name);
            if (claimedId) {
                target = Game.getObjectById(claimedId);
                // If claimed site vanished/finished, release claim
                if (!target) Build.release(creep.room.name, creep.name, true);
            }
            if (!target) {
                // Build a skip set of sites already claimed by other creeps in this room
                const roomMem = (Memory.rooms && Memory.rooms[creep.room.name]) || {};
                const claims = (roomMem.buildClaims && roomMem.buildClaims.bySite) || {};
                const skip = new Set();
                for (const sid in claims) {
                    if (claims[sid] !== creep.name) skip.add(sid);
                }
                target = Con.pick(creep.room, skip);
            }
            if (target) {
                if (Threat.isDanger(target.pos, creep.room.name)) {
                    Build.release(creep.room.name, creep.name, true);
                    const safeSites = creep.room.find(FIND_CONSTRUCTION_SITES, {
                        filter: (s) => !Threat.isDanger(s.pos, creep.room.name),
                    });
                    target = safeSites.length ? creep.pos.findClosestByPath(safeSites) : null;
                }
                // Say build with percent progress when available
                var pct = null;
                if (
                    typeof target.progress === 'number' &&
                    typeof target.progressTotal === 'number' &&
                    target.progressTotal > 0
                ) {
                    pct = Math.round((target.progress * 100) / target.progressTotal);
                }
                if (pct != null) Say.changed(creep, 'BUILD', { pct: pct });
                else Say.changed(creep, 'BUILD');
                Log.onChange(
                    `builder.state.${creep.room.name}.${creep.name}`,
                    'build',
                    G.info(
                        `${creep.name} building`,
                        [
                            'Prioritize roads/containers early.',
                            'Keep extensions near spawn for quick fill.',
                        ],
                        { file: 'role.builder.js', room: creep.room.name, creep: creep.name },
                        'BUILDER_BUILD'
                    ),
                    'debug'
                );
                // Attempt claim for >=95% sites (exclusive). If owned by other, bail and retry next tick.
                const claimRes = Build.claim(creep.room.name, creep.name, target);
                if (claimRes === null) {
                    // owned by another; do not thrash this tick; try again next tick
                    return;
                }
                if (creep.build(target) === ERR_NOT_IN_RANGE) {
                    Say.changed(creep, 'MOVE');
                    Pathing.step(creep, target, {
                        visualize: false,
                        style: Paths.roles.builder.build,
                    });
                } else if (
                    typeof target.progress === 'number' &&
                    typeof target.progressTotal === 'number' &&
                    target.progressTotal > 0 &&
                    (100 * target.progress) / target.progressTotal >= 99
                ) {
                    // If target is essentially done, release exclusive claim so others can pick new work
                    Build.release(creep.room.name, creep.name, true);
                }
            } else {
                // Idle gently when no work; say rarely to avoid noise
                Say.every(creep, 'IDLE', 100);
                Log.onChange(
                    `builder.noSites.${creep.room.name}`,
                    'none',
                    G.info(
                        `No construction sites in ${creep.room.name}`,
                        [
                            'Use planners (containers/extensions) or place sites manually.',
                            'Switch some builders to upgrader if idle persists.',
                        ],
                        { file: 'role.builder.js', room: creep.room.name },
                        'NO_SITES'
                    ),
                    'info'
                );
            }
        } else {
            Log.onChange(
                `builder.state.${creep.room.name}.${creep.name}`,
                'harvest',
                G.info(
                    `${creep.name} gathering energy`,
                    [
                        'Prefer withdrawing from containers to reduce pathing.',
                        'Add a miner to keep containers stocked.',
                    ],
                    { file: 'role.builder.js', room: creep.room.name, creep: creep.name },
                    'BUILDER_HARVEST'
                ),
                'debug'
            );
            const sid = Sources.closestSourceId(creep);
            const src = sid ? Game.getObjectById(sid) : null;
            if (src && !Threat.isDanger(src.pos, creep.room.name)) {
                // Announce harvest intent; move if not in range
                if (creep.harvest(src) === ERR_NOT_IN_RANGE) {
                    Say.changed(creep, 'MOVE');
                    Pathing.step(creep, src, {
                        visualize: false,
                        style: Paths.roles.builder.harvest,
                    });
                } else {
                    Say.changed(creep, 'HARVEST');
                }
            } else {
                const containers = creep.room.find(FIND_STRUCTURES, {
                    filter: (s) =>
                        s.structureType === STRUCTURE_CONTAINER &&
                        s.store[RESOURCE_ENERGY] > 0 &&
                        !Threat.isDanger(s.pos, creep.room.name),
                });
                if (containers.length) {
                    const c = creep.pos.findClosestByPath(containers);
                    if (creep.withdraw(c, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                        Say.changed(creep, 'MOVE');
                        Pathing.step(creep, c, {
                            visualize: false,
                            style: Paths.roles.builder.harvest,
                        });
                    } else {
                        Say.changed(creep, 'WITHDRAW');
                    }
                } else {
                    Say.every(creep, 'IDLE', 80);
                }
            }
        }
        Say.funny(creep);
        Say.funnyLong(creep);
    },
};

module.exports = roleBuilder;
