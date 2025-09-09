/* eslint-env screeps */
// Import modules
var {
    mgrSpawn,
    mgrCont,
    mgrExt,
    mgrTower,
    mgrRoad,
    mgrWall,
    Roles,
    Threat,
    HaulQ,
    BuildSvc,
    SrcSvc,
    Cache,
    Heartbeat,
    Log,
    Config,
    DebugCfg,
    Names,
    Creeps = require('./master.index').Creeps || global.Creeps,
} = require('./master.index');

module.exports = {
    loop: function () {
        // Initialize configurable defaults (idempotent)
        if (Config && typeof Config.init === 'function') Config.init();
        if (DebugCfg && typeof DebugCfg.init === 'function') DebugCfg.init();
        if (Log && typeof Log.once === 'function')
            Log.once('main.init', 'main initialized', 'main');
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
        // Threat scan, source planning, and build sweeping for each room (always call if present)
        for (const roomName in Game.rooms) {
            // Use global.room if defined, else fallback to Game.rooms[roomName]
            const room =
                typeof global !== 'undefined' && global.room ? global.room : Game.rooms[roomName];

            // Threat scan
            if (global.Threat && typeof global.Threat.scan === 'function') {
                try {
                    global.Threat.scan(room);
                } catch (e) {
                    if (Log && typeof Log.error === 'function') {
                        Log.error('Threat.scan error', e && e.stack ? e.stack : e);
                    }
                }
            }
            // Source planner
            if (global.SrcSvc && typeof global.SrcSvc.plan === 'function') {
                try {
                    global.SrcSvc.plan(room);
                } catch (e) {
                    if (Log && typeof Log.error === 'function') {
                        Log.error('SrcSvc.plan error', e && e.stack ? e.stack : e);
                    }
                }
            }
            // Build sweeper
            if (
                (global.BuildSvc && typeof global.BuildSvc.sweep === 'function') ||
                (BuildSvc && typeof BuildSvc.sweep === 'function')
            ) {
                try {
                    if (global.BuildSvc && typeof global.BuildSvc.sweep === 'function') {
                        global.BuildSvc.sweep(room);
                    } else if (BuildSvc && typeof BuildSvc.sweep === 'function') {
                        BuildSvc.sweep(room);
                    }
                } catch (e) {
                    if (Log && typeof Log.error === 'function') {
                        Log.error('BuildSvc.sweep error', e && e.stack ? e.stack : e);
                    }
                }
            }
        }

        // Enqueue refill jobs for sinks that need energy (simple scan)
        for (const roomName in Game.rooms) {
            // Use global.room if defined and has .find, else fallback to Game.rooms[roomName]
            let room = undefined;
            if (
                typeof global !== 'undefined' &&
                global.room &&
                typeof global.room.find === 'function'
            ) {
                room = global.room;
            } else if (Game.rooms[roomName] && typeof Game.rooms[roomName].find === 'function') {
                room = Game.rooms[roomName];
            }
            if (!room) continue;
            let sinks = [];
            let containers = [];
            try {
                sinks = room.find(FIND_STRUCTURES, {
                    filter: (s) =>
                        (s.structureType === STRUCTURE_EXTENSION ||
                            s.structureType === STRUCTURE_SPAWN ||
                            s.structureType === STRUCTURE_TOWER) &&
                        s.store.getFreeCapacity(RESOURCE_ENERGY) > 0,
                });
            } catch (e) {
                Log &&
                    typeof Log.error === 'function' &&
                    Log.error('sinks error', e && e.stack ? e.stack : e);
                sinks = [];
            }
            try {
                containers = room.find(FIND_STRUCTURES, {
                    filter: (x) =>
                        x.structureType === STRUCTURE_CONTAINER && x.store[RESOURCE_ENERGY] > 0,
                });
            } catch (e) {
                Log &&
                    typeof Log.error === 'function' &&
                    Log.error('containers error', e && e.stack ? e.stack : e);
                containers = [];
            }
            const src =
                room.storage ||
                (Array.isArray(containers) && containers.length > 0 ? containers[0] : null) ||
                null;
            if (src && HaulQ && typeof HaulQ.enqueueRefill === 'function') {
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

        // Bucket-gated path cache maintenance (cheap sweep)
        if (Game.time % 100 === 0 && Game.cpu && Game.cpu.bucket >= 8000) {
            Cache.sweep(Memory.pathCache, 50);
        }

        // Managers: tower and ramparts/walls last
        if (mgrTower && typeof mgrTower.loop === 'function') mgrTower.loop();
        if (mgrWall && typeof mgrWall.loop === 'function') mgrWall.loop();

        // Run creep roles
        // Use Creeps registry for role dispatch
        if (Creeps && typeof Creeps.logSummary === 'function') {
            Creeps.logSummary(); // Log metrics for observability
        }
        for (const roomName in Game.rooms) {
            // Defensive: skip if Creeps or inRoom is missing
            if (!Creeps || typeof Creeps.inRoom !== 'function') continue;
            for (const creep of Creeps.inRoom(roomName)) {
                const role = creep.memory.role;
                if (Roles[role] && typeof Roles[role].run === 'function') {
                    Roles[role].run(creep);
                }
            }
        }

        // Enforce threat retreat/hold after roles so it can override movement intents
        if (Threat && typeof Threat.enforce === 'function') {
            for (const roomName in Game.rooms) Threat.enforce(Game.rooms[roomName]);
        }

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
        const memObj = typeof global !== 'undefined' && global.Memory ? global.Memory : Memory;
        if (typeof memObj === 'object' && memObj.creeps) {
            for (const name in memObj.creeps) {
                if (!Game.creeps[name]) {
                    try {
                        if (Log && typeof Log.info === 'function') {
                            const birth = memObj.creeps[name] && memObj.creeps[name].born;
                            const age = typeof birth === 'number' ? Game.time - birth : 'unknown';
                            Log.info('Cleanup creep ' + name + ' age=' + age, 'cleanup');
                        }
                        // Try release miner seat
                        if (memObj.rooms) {
                            for (const r in memObj.rooms) {
                                SrcSvc.releaseMinerSeat(r, name);
                            }
                        }
                        // Release name assignment
                        if (Names && typeof Names.releaseForCreep === 'function')
                            Names.releaseForCreep(name);
                    } catch (e) {
                        console.log(
                            'Error during creep cleanup for',
                            name,
                            e && e.stack ? e.stack : e
                        );
                    } finally {
                        // Always delete memory, even if above throws
                        delete memObj.creeps[name];
                    }
                }
            }
        }
    },
};
