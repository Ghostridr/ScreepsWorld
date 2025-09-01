// Import modules
var managerSpawner = require('manager.spawner');
var roleHarvester = require('role.harvester');
var roleUpgrader = require('role.upgrader');
var roleBuilder = require('role.builder');

module.exports.loop = function () {
    // Creep spawning handler
    if (managerSpawner && typeof managerSpawner.loop === 'function') {
        managerSpawner.loop();
    }

    // Tower defense
    var tower = Game.getObjectById('eca0418e8ed348cfb2696e8c');
    if(tower) {
        // Find the closest damaged structure
        var closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: (structure) => structure.hits < structure.hitsMax
        });
        // Repair damaged structures
        if(closestDamagedStructure) {
            tower.repair(closestDamagedStructure);
        }
        // Attack hostile creeps
        var closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        if(closestHostile) {
            tower.attack(closestHostile);
        }
    }

    // Run creep roles
    for(var name in Game.creeps) {
        var creep = Game.creeps[name];
        // Harvester role
        if(creep.memory.role === 'harvester') {
            roleHarvester.run(creep);
        }
        // Upgrader role
        if(creep.memory.role === 'upgrader') {
            roleUpgrader.run(creep);
        }
        // Builder role
        if(creep.memory.role === 'builder') {
            roleBuilder.run(creep);
        }
    }

    // Can I recycle creeps? Check tomorrow
}