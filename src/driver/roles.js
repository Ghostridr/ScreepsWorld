/**
 * @fileoverview Role dispatcher for ScreepsWorld.
 * @module driver/roles
 * @description Exports a registry for all role modules.
 */

/* eslint-env screeps */

const Roles = {
    harvester: require('../role/harvester'),
    hauler: require('../role/hauler'),
    upgrader: require('../role/upgrader'),
    builder: require('../role/builder'),
    healer: require('../role/healer'),
    miner: require('../role/miner'),
    repairer: require('../role/repairer'),
};

module.exports = { Roles };
