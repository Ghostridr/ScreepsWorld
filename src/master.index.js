// master.index.js — Flat barrel for all src modules
// Purpose: Centralized, short-named exports for every module in src/**. Use this for testing and integration.
// Usage: const { main, build, ... } = require('../src/master.index');
module.exports = {
    // main
    main: require('./main'),

    // behavior
    Build: require('./behavior/build'),
    Construction: require('./behavior/construction'),
    Haul: require('./behavior/haul'),
    Heal: require('./behavior/heal'),
    Pathing: require('./behavior/pathing'),
    Repair: require('./behavior/repair'),
    Say: require('./behavior/say'),
    Sources: require('./behavior/sources'),

    // catalog
    Guidance: require('./catalog/guidance'),
    Names: require('./catalog/names'),

    // config
    Colors: require('./config/colors'),
    Constants: require('./config/constants'),
    DebugCfg: require('./config/debug'),
    Paths: require('./config/paths'),
    Scaler: require('./config/scaler'),

    // driver
    Roles: require('./driver/roles'),

    // helper
    guidanceHelper: require('./helper/guidance'),

    // manager
    mgrCont: require('./manager/container'),
    mgrExt: require('./manager/extension'),
    mgrRoad: require('./manager/road'),
    mgrSpawn: require('./manager/spawner'),
    mgrTower: require('./manager/tower'),
    mgrWall: require('./manager/wall'),

    // role
    Builder: require('./role/builder'),
    Harvester: require('./role/harvester'),
    Hauler: require('./role/hauler'),
    Healer: require('./role/healer'),
    Miner: require('./role/miner'),
    Repairer: require('./role/repairer'),
    Upgrader: require('./role/upgrader'),

    // service
    Threat: require('./service/auto.detect'),
    Creeps: require('./service/creeps'),
    Flags: require('./service/flags'),
    Market: require('./service/market'),
    Metrics: require('./service/metrics'),
    Power: require('./service/power'),
    Rooms: require('./service/rooms'),
    Spawns: require('./service/spawns'),
    Structures: require('./service/structures'),
    Towers: require('./service/towers'),

    // task
    Task: require('./task/task'),

    // util
    Cache: require('./util/caching'),
    Heartbeat: require('./util/heartbeat'),
    Log: require('./util/logger'),
    Mapper: require('./util/mapper'),
    Memory: require('./util/memory'),
};
