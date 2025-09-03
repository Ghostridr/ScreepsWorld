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
var Log = require('util.logger');
var Config = require('config.constants');
var HaulQ = require('service.haul');
var SrcSvc = require('service.sources');
var BuildSvc = require('service.build');
var Heartbeat = require('util.heartbeat');
var Names = require('catalog.names');
var Cache = require('util.caching');

module.exports.loop = function () {
    // Initialize configurable defaults (idempotent)
    if (Config && typeof Config.init === 'function') Config.init();
    if (Log && typeof Log.once === 'function') Log.once('main.init', 'main initialized', 'main');
    // Creep spawning handler
    if (mgrSpawn && typeof mgrSpawn.loop === 'function') {
        mgrSpawn.loop();
    }

    // Lightweight planners
    if (mgrCont && typeof mgrCont.loop === 'function') {
        mgrCont.loop();
    }
    if (mgrExt && typeof mgrExt.loop === 'function') {
        mgrExt.loop();
    }
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

    // Managers: tower/road/wall
    if (mgrTower && typeof mgrTower.loop === 'function') mgrTower.loop();
    if (mgrRoad && typeof mgrRoad.loop === 'function') mgrRoad.loop();
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
    }

    // Heartbeat/role-mix logs
    if (Heartbeat && typeof Heartbeat.run === 'function') Heartbeat.run();

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
    // Can I recycle creeps? Check tomorrow
};
