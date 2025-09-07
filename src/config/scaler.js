/* eslint-env screeps */
// config.scaler.js — All dynamic desired-role scaling logic lives here.
// Exports: getDesiredRoleCounts(room, env)
//   env.ROLE_COUNTS: baseline counts
//   env.getBodyTemplate(role, room): function to estimate bodies (used to count WORK parts)

module.exports.getDesiredRoleCounts = function (room, env) {
    var base = env && env.ROLE_COUNTS ? env.ROLE_COUNTS : {};
    if (!room || !room.controller) return base;
    var lvl = room.controller.level || 1;
    var sources = room.find ? room.find(FIND_SOURCES).length : 2;
    var sites = room.find ? room.find(FIND_CONSTRUCTION_SITES).length : 0;
    var containers = room.find
        ? room.find(FIND_STRUCTURES, { filter: (s) => s.structureType === STRUCTURE_CONTAINER })
              .length
        : 0;
    var hasStorage = !!room.storage;
    var storageEnergy =
        hasStorage && room.storage.store ? room.storage.store[RESOURCE_ENERGY] || 0 : 0;

    function avgSourceRangeToSpawn(r) {
        try {
            var spawns = r.find ? r.find(FIND_MY_SPAWNS) : [];
            if (!spawns || spawns.length === 0) return 20;
            var srcs = r.find ? r.find(FIND_SOURCES) : [];
            if (!srcs || srcs.length === 0) return 20;
            var total = 0;
            for (var i = 0; i < srcs.length; i++) {
                var s = srcs[i];
                var best = 9999;
                for (var j = 0; j < spawns.length; j++) {
                    var d = s.pos.getRangeTo(spawns[j]);
                    if (d < best) best = d;
                }
                total += best;
            }
            return Math.max(5, Math.round(total / srcs.length));
        } catch (e) {
            void e;
            return 20;
        }
    }
    var rangeAvg = avgSourceRangeToSpawn(room);

    var d = { harvester: 2, upgrader: 1, builder: 1, miner: 0, hauler: 0, healer: 0, repairer: 0 };

    if (lvl <= 1) {
        d.harvester = Math.max(2, Math.min(4, sources * 2));
        d.builder = Math.min(2, sites > 0 ? 1 + Math.floor(sites / 5) : 1);
        d.upgrader = 1;
        d.miner = 0;
        d.hauler = 0;
    } else if (lvl === 2) {
        var miners = containers > 0 ? Math.min(sources, containers) : 0;
        d.miner = miners;
        d.harvester = miners >= sources ? 1 : Math.max(2, Math.min(4, sources * 2));
        d.hauler = miners > 0 ? 1 : 0;
        d.builder = Math.min(3, Math.max(1, Math.ceil(sites / 4)));
        var damagedEarly = room.find
            ? room.find(FIND_STRUCTURES, { filter: (s) => s.hits < s.hitsMax * 0.7 }).length
            : 0;
        d.repairer = damagedEarly > 10 ? 1 : 0;
        d.upgrader = 2;
    } else {
        // RCL3+
        d.miner = sources;
        var haulFactor = Math.max(1, Math.round(rangeAvg / 12));
        d.hauler = Math.min(5, haulFactor + (hasStorage ? 1 : 0));
        d.harvester = 0;

        var capAvailRoom = room.energyCapacityAvailable || 300;
        var availRatio = capAvailRoom > 0 ? (room.energyAvailable || 0) / capAvailRoom : 0;
        var econTier = 0;
        if (hasStorage) {
            econTier =
                storageEnergy < 5000
                    ? 0
                    : storageEnergy < 20000
                      ? 1
                      : storageEnergy < 120000
                        ? 2
                        : 3;
        } else {
            econTier = availRatio < 0.5 ? 0 : availRatio < 0.9 ? 1 : 2;
        }

        // Builders by backlog and economy
        var siteObjs = room.find ? room.find(FIND_CONSTRUCTION_SITES) : [];
        var buildBacklog = 0;
        for (var si = 0; si < siteObjs.length; si++) {
            var cs = siteObjs[si];
            buildBacklog += Math.max(0, (cs.progressTotal || 0) - (cs.progress || 0));
        }
        var builderTempl =
            env && env.getBodyTemplate ? env.getBodyTemplate('builder', room) : [WORK, CARRY, MOVE];
        var builderWORK = 0;
        for (var bi = 0; bi < builderTempl.length; bi++)
            if (builderTempl[bi] === WORK) builderWORK++;
        if (!builderWORK) builderWORK = 1;
        var buildHorizon = 2500;
        var buildRatePerBuilder = builderWORK * 5;
        var buildersByBacklog =
            buildRatePerBuilder > 0
                ? Math.ceil(buildBacklog / (buildRatePerBuilder * buildHorizon))
                : 0;
        var builderCap = hasStorage ? [1, 2, 4, 6][econTier] : [1, 2, 3][econTier];
        var builderFloor = siteObjs.length > 0 ? 1 : 0;
        d.builder = Math.max(builderFloor, Math.min(builderCap, Math.max(1, buildersByBacklog)));

        // Upgraders by storage/controller
        var ctl = room.controller;
        var ticksToDowngrade = (ctl && ctl.ticksToDowngrade) || 0;
        var isRCL8 = (ctl && ctl.level) === 8;
        var upgraderTempl =
            env && env.getBodyTemplate
                ? env.getBodyTemplate('upgrader', room)
                : [WORK, CARRY, MOVE];
        var upgraderWORK = 0;
        for (var ui = 0; ui < upgraderTempl.length; ui++)
            if (upgraderTempl[ui] === WORK) upgraderWORK++;
        if (!upgraderWORK) upgraderWORK = 1;
        if (isRCL8) {
            d.upgrader = hasStorage ? (storageEnergy > 200000 ? 2 : 1) : 1;
        } else {
            if (hasStorage) {
                d.upgrader =
                    storageEnergy < 5000
                        ? 1
                        : storageEnergy < 20000
                          ? 2
                          : storageEnergy < 40000
                            ? 3
                            : storageEnergy < 120000
                              ? 4
                              : 6;
            } else {
                d.upgrader = econTier >= 2 ? 2 : 1;
            }
            if (ticksToDowngrade && ticksToDowngrade < 5000) d.upgrader = Math.max(d.upgrader, 2);
        }

        // Harvester fallback
        if ((containers === 0 || d.miner < sources) && d.harvester < 1) d.harvester = 1;

        // Repairers via rampart backlog
        try {
            var Repair = require('service.repair');
            var RB = Repair.rampartBacklog(room);
            var pol =
                (Memory.rooms &&
                    Memory.rooms[room.name] &&
                    Memory.rooms[room.name].rampartPolicy) ||
                {};
            var horizon = typeof pol.horizonTicks === 'number' ? pol.horizonTicks : 4000;
            var workPerRepairer = typeof pol.workPerRepairer === 'number' ? pol.workPerRepairer : 3;
            var hitsPerTickPerCreep = workPerRepairer * 100;
            var burst =
                hitsPerTickPerCreep > 0 && horizon > 0
                    ? Math.ceil(RB.deficit / (hitsPerTickPerCreep * horizon))
                    : 0;
            var upkeep = RB.maintainedCount ? Math.ceil(RB.maintainedCount / 12) : 0;
            var minUpkeep = RB.maintainedCount > 0 ? 1 : 0;
            var targetRepairers = Math.max(minUpkeep, burst + upkeep);
            d.repairer = Math.min(6, Math.max(d.repairer || 0, targetRepairers));
        } catch (e) {
            void e;
        }
    }

    // Healers scaling
    try {
        var capAvail = (room && room.energyCapacityAvailable) || 0;
        var healerUnlocked = capAvail >= 300;
        if (healerUnlocked) {
            var baseMin;
            if (lvl <= 3) baseMin = 1;
            else if (lvl <= 6) baseMin = 2;
            else baseMin = 3;
            d.healer = Math.max(d.healer || 0, baseMin);
            var hostileCount = room.find ? room.find(FIND_HOSTILE_CREEPS).length : 0;
            if (hostileCount > 0) {
                var extra = Math.ceil(hostileCount / 3);
                d.healer = Math.max(d.healer, baseMin + extra);
            }
        }
    } catch (e) {
        void e;
    }

    // Safety rails
    if (d.miner > 0 && (d.hauler || 0) < 1) d.hauler = 1;
    if (containers > 0 && d.miner === 0 && (d.harvester || 0) < 1) d.harvester = 1;
    if ((d.harvester || 0) + (d.builder || 0) + (d.upgrader || 0) === 0) d.harvester = 1;

    // Per-room overrides
    try {
        if (
            Memory &&
            Memory.rooms &&
            Memory.rooms[room.name] &&
            Memory.rooms[room.name].roleCounts
        ) {
            var ov = Memory.rooms[room.name].roleCounts;
            for (var k in ov) if (Object.prototype.hasOwnProperty.call(ov, k)) d[k] = ov[k];
        }
    } catch (e) {
        void e;
    }

    return d;
};
