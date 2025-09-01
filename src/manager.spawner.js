// Auto-spawn creeps for all roles
const roleModules = {};
const roleNames = [
	'builder',
	'harvester',
	'upgrader'
];

// Default desired counts for each role
const desiredCounts = {};
roleNames.forEach(role => {
	desiredCounts[role] = 2;
});

// Dynamically require all role modules
roleNames.forEach(role => {
	try {
		roleModules[role] = require('role.' + role);
	} catch (e) {
		console.log('Role not found:', role);
	}
});

// Spawn loop
module.exports.loop = function() {
	for (let spawnName in Game.spawns) {
		const spawn = Game.spawns[spawnName];
		for (let role of roleNames) {
			const creepsWithRole = _.filter(Game.creeps, c => c.memory.role === role);
			if (creepsWithRole.length < desiredCounts[role]) {
				// Body selection (to be improved)
				let body = [WORK, CARRY, MOVE];
				if (role === 'builder') body = [WORK, WORK, CARRY, MOVE];
				if (role === 'upgrader') body = [WORK, CARRY, MOVE, MOVE];
				if (role === 'harvester') body = [WORK, CARRY, MOVE];
				let newName = role + Game.time;
				let result = spawn.spawnCreep(body, newName, {memory: {role: role}});
				// Spawn handler
				if (result === OK) {
					console.log('Spawning new ' + role + ': ' + newName);
				}
			}
		}
	}
};
