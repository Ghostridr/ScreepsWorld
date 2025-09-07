/* eslint-env screeps */
// Import modules
var mgrSpawn = require('manager.spawner');
var mgrCont = require('manager.container');
var mgrExt = require('manager.extension');
var mgrTower = require('manager.tower');
var mgrRoad = require('manager.road');
var mgrWall = require('manager.wall');
var Harvester = require('role.harvester');
var Upgrader = require('role.upgrader');
var Builder = require('role.builder');
var Miner = require('role.miner');
var Hauler = require('role.hauler');
var Healer = require('role.healer');
var Repairer = require('role.repairer');
var Log = require('util.logger');
var Config = require('config.constants');
var HaulQ = require('behavior.haul');
var SrcSvc = require('behavior.sources');
var BuildSvc = require('behavior.build');
var Heartbeat = require('util.heartbeat');
var Names = require('catalog.names');
var Cache = require('util.caching');
var Threat = require('service.auto.detect');
var DebugCfg = require('config.debug');

module.exports.loop = function () {
    // Initialize configurable defaults (idempotent)
    if (Config && typeof Config.init === 'function') Config.init();
    if (DebugCfg && typeof DebugCfg.init === 'function') DebugCfg.init();
    if (Log && typeof Log.once === 'function') Log.once('main.init', 'main initialized', 'main');
    // Creep spawning handler
    if (mgrSpawn && typeof mgrSpawn.loop === 'function') {
        mgrSpawn.loop();
    }

    // Lightweight planners — enforce build order: containers → roads → extensions → ramparts
    if (mgrCont && typeof mgrCont.loop === 'function') {
        // 1) place container sites first near sources
        mgrCont.loop();
    }
    if (mgrRoad && typeof mgrRoad.loop === 'function') {
        // 2) then lay roads to those containers/sources
        mgrRoad.loop();
    }
    if (mgrExt && typeof mgrExt.loop === 'function') {
        // 3) then place extension clusters
        mgrExt.loop();
    }
    // Threat scan early
    for (const roomName in Game.rooms) Threat.scan(Game.rooms[roomName]);

    // Enqueue refill jobs for sinks that need energy (simple scan)
    for (const roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        const sinks = room.find(FIND_STRUCTURES, {
            filter: (s) =>
                (s.structureType === STRUCTURE_EXTENSION ||
                    s.structureType === STRUCTURE_SPAWN ||
                    s.structureType === STRUCTURE_TOWER) &&
                s.store.getFreeCapacity(RESOURCE_ENERGY) > 0,
        });
        const src =
            room.storage ||
            room.find(FIND_STRUCTURES, {
                filter: (x) =>
                    x.structureType === STRUCTURE_CONTAINER && x.store[RESOURCE_ENERGY] > 0,
            })[0] ||
            null;
        if (src) {
            for (const s of sinks) {
                HaulQ.enqueueRefill(
                    room.name,
                    src.id,
                    s.id,
                    s.store.getFreeCapacity(RESOURCE_ENERGY)
                );
            }
        }
    }
    // Periodically index sources and sweep build claims
    if (Game.time % 50 === 0) {
        for (const name in Game.rooms) SrcSvc.plan(Game.rooms[name]);
        for (const name in Game.rooms) BuildSvc.sweep(Game.rooms[name]);
    }

    // Bucket-gated path cache maintenance (cheap sweep)
    if (Game.time % 100 === 0 && Game.cpu && Game.cpu.bucket >= 8000) {
        Cache.sweep(Memory.pathCache, 50);
    }

    // Managers: tower and ramparts/walls last
    if (mgrTower && typeof mgrTower.loop === 'function') mgrTower.loop();
    if (mgrWall && typeof mgrWall.loop === 'function') mgrWall.loop();

    // Run creep roles
    for (var name in Game.creeps) {
        var creep = Game.creeps[name];
        // Harvester role
        if (creep.memory.role === 'harvester') {
            Harvester.run(creep);
        }
        // Upgrader role
        if (creep.memory.role === 'upgrader') {
            Upgrader.run(creep);
        }
        // Builder role
        if (creep.memory.role === 'builder') {
            Builder.run(creep);
        }
        // Hauler role
        if (creep.memory.role === 'hauler') {
            Hauler.run(creep);
        }
        // Miner role
        if (creep.memory.role === 'miner') {
            Miner.run(creep);
        }
        // Healer role
        if (creep.memory.role === 'healer') {
            Healer.run(creep);
        }
        // Repairer role
        if (creep.memory.role === 'repairer') {
            Repairer.run(creep);
        }
    }

    // Enforce threat retreat/hold after roles so it can override movement intents
    for (const roomName in Game.rooms) Threat.enforce(Game.rooms[roomName]);

    // Heartbeat/role-mix logs
    if (Heartbeat && typeof Heartbeat.run === 'function') Heartbeat.run();
    // Auto-scan any manually placed or other unmanaged construction sites, then flush grouped log
    try {
        Log.construction.autoScan();
    } catch (e) {
        console.log('Logger error in construction autoScan', e && e.stack ? e.stack : e);
    }
    try {
        Log.construction.flush();
    } catch (e) {
        console.log('Logger error flushing construction log', e && e.stack ? e.stack : e);
    }

    // Housekeeping: release miner seats for dead creeps
    for (const name in Memory.creeps) {
        if (!Game.creeps[name]) {
            if (Log && typeof Log.info === 'function') {
                const birth = Memory.creeps[name] && Memory.creeps[name].born;
                const age = typeof birth === 'number' ? Game.time - birth : 'unknown';
                Log.info('Cleanup creep ' + name + ' age=' + age, 'cleanup');
            }
            // Try release miner seat
            // Iterate rooms where the creep may have lived
            for (const r in Memory.rooms) {
                SrcSvc.releaseMinerSeat(r, name);
            }
            // Release name assignment
            if (Names && typeof Names.releaseForCreep === 'function') Names.releaseForCreep(name);
            delete Memory.creeps[name];
        }
    }
};
