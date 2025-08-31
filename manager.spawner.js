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