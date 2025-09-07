/* eslint-env screeps */
// role.repairer.js — Dedicated structural maintenance using service.repair floors & priority
var Repair = require('behavior.repair');
var Paths = require('config.paths');
var Pathing = require('behavior.pathing');
var Say = require('behavior.say');
var Threat = require('service.auto.detect');

module.exports = {
    /** @param {Creep} creep */
    run: function (creep) {
        var room = creep.room;
        var energyFloor = 300; // don't drain hub below this
        var hub =
            room.storage ||
            creep.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: function (s) {
                    return (
                        s.structureType === STRUCTURE_CONTAINER &&
                        s.store[RESOURCE_ENERGY] > energyFloor
                    );
                },
            });

        function ensureEnergy() {
            if (creep.store[RESOURCE_ENERGY] > 0) return true;
            if (!hub) return false;
            if (Threat.isDanger(hub.pos, creep.room.name)) return false;
            if (creep.pos.getRangeTo(hub) > 1) {
                Pathing.step(creep, hub, { visualize: false, style: Paths.roles.builder.move });
                return false;
            }
            creep.withdraw(hub, RESOURCE_ENERGY);
            return creep.store[RESOURCE_ENERGY] > 0;
        }

        // Validate/refresh target
        var tgt = Game.getObjectById(creep.memory.tid);
        var pickIfNeeded = !tgt;
        if (tgt && tgt.hits >= (tgt.hitsMax || 0)) pickIfNeeded = true;
        if (pickIfNeeded) {
            tgt = Repair.pickTargetForCreep(room, creep.pos);
            creep.memory.tid = tgt && tgt.id;
        }
        if (!tgt) return; // nothing to do
        if (Threat.isDanger(tgt.pos, creep.room.name)) return; // avoid dangerous targets

        // Get energy, then repair
        if (!ensureEnergy()) return;
        var res = creep.repair(tgt);
        // Announce hammer with target health percent (uses UPG key mapped to 🔨)
        if (tgt && tgt.hitsMax) {
            var pct = Math.max(0, Math.min(100, Math.round((tgt.hits * 100) / tgt.hitsMax)));
            // Use changed() to keep noise low; updates as pct rises
            Say.changed(creep, 'UPG', { pct: pct });
        }
        if (res === ERR_NOT_IN_RANGE) {
            Pathing.step(creep, tgt, { visualize: false, style: Paths.roles.builder.move });
        }
    },
};
