// Auto-spawn creeps for all roles
const roleModules = {};
const roleNames = ['builder', 'harvester', 'upgrader'];

// Default desired counts for each role
const desiredCounts = {};
roleNames.forEach((role) => {
    desiredCounts[role] = 2;
});

// Dynamically require all role modules
roleNames.forEach((role) => {
    try {
        roleModules[role] = require('role.' + role);
    } catch (e) {
        const details = [
            '[manager.spawner] Failed to load role module: role.' + role,
            'Error: ' + (e && e.message ? e.message : String(e)),
            e && e.stack ? 'Stack: ' + e.stack : null,
            'How to fix:',
            "- Ensure file 'role." + role + ".js' exists in this folder.",
            '- Check for typos and case-sensitivity (file names are case-sensitive).',
            '- Verify the module exports: module.exports = { run: function(creep) { ... } } or similar.',
            '- If you renamed a role, update roleNames in manager.spawner.js.',
            '- If this is expected for training, you can ignore this message.',
        ]
            .filter(Boolean)
            .join('\n');
        console.error(details);
    }
});

// Spawn loop
module.exports.loop = function () {
    for (const spawnName in Game.spawns) {
        const spawn = Game.spawns[spawnName];
        for (const role of roleNames) {
            const creepsWithRole = _.filter(Game.creeps, (c) => c.memory.role === role);
            if (creepsWithRole.length < desiredCounts[role]) {
                // Body selection (to be improved)
                let body = [WORK, CARRY, MOVE];
                if (role === 'builder') body = [WORK, WORK, CARRY, MOVE];
                if (role === 'upgrader') body = [WORK, CARRY, MOVE, MOVE];
                if (role === 'harvester') body = [WORK, CARRY, MOVE];
                const newName = role + Game.time;
                const result = spawn.spawnCreep(body, newName, { memory: { role: role } });
                // Spawn handler
                if (result === OK) {
                    console.log('Spawning new ' + role + ': ' + newName);
                }
            }
        }
    }
};
