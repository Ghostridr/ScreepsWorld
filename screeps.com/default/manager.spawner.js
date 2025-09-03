// Auto-spawn creeps for all roles
const Log = require('util.logger').withTag('spawn');
const Config = require('config.constants');
const Names = require('catalog.names');
const roleModules = {};
const roleNames = Config.getRoleNames();

// Dynamically require all role modules
roleNames.forEach((role) => {
    try {
        roleModules[role] = require('role.' + role);
    } catch (e) {
        const G = require('helper.guidance');
        const summary = '[manager.spawner] Failed to load role module: role.' + role;
        const details = [
            summary,
            'Error: ' + (e && e.message ? e.message : String(e)),
            e && e.stack ? 'Stack: ' + e.stack : null,
            G.error(
                'Resolution guidance',
                [
                    "Ensure file 'role." + role + ".js' exists.",
                    'Check filename case-sensitivity.',
                    'Verify module.exports exposes run(creep).',
                    'Update roleNames if you renamed the role.',
                ],
                { file: 'role.' + role + '.js', other: 'manager.spawner.js' },
                'ROLE_LOAD'
            ),
        ]
            .filter(Boolean)
            .join('\n');
        Log.error(details);
    }
});

// Spawn loop
module.exports.loop = function () {
    for (const spawnName in Game.spawns) {
        const spawn = Game.spawns[spawnName];
        const desiredCounts = Config.getDesiredRoleCounts(spawn.room);

        // Helpers
        function bodyCost(parts) {
            let sum = 0;
            for (let i = 0; i < parts.length; i++) sum += BODYPART_COST[parts[i]] || 0;
            return sum;
        }
        function minimalBody(role) {
            // Cheap, safe minimum kits per role
            if (role === 'miner') return [WORK, WORK, MOVE]; // 250
            if (role === 'hauler') return [CARRY, CARRY, MOVE]; // 150
            // worker (harvester/builder/upgrader)
            return [WORK, CARRY, MOVE]; // 200
        }
        function affordableBody(role, room) {
            // Start with the configured template (capacity-scaled)
            const templ = Config.getBodyTemplate(role, room);
            const avail = room.energyAvailable || 0;
            const cost = bodyCost(templ);
            if (cost <= avail) return templ;
            // If the template is too expensive right now, fall back to a minimal kit for the role
            const cheap = minimalBody(role);
            return bodyCost(cheap) <= avail ? cheap : cheap; // return cheap regardless; spawn will wait until afford
        }

        // Economy guardrails
        const creeps = Object.values(Game.creeps);
        const countByRole = _.countBy(creeps, (c) => c.memory.role);
        const workersPresent = (countByRole.harvester || 0) + (countByRole.miner || 0) > 0;
        const haulersPresent = (countByRole.hauler || 0) > 0;

        // 1) Hard bootstrap: if no creeps exist, spawn one basic harvester ASAP
        if (creeps.length === 0) {
            const body = minimalBody('harvester');
            const cand = Names.candidate('harvester');
            if (
                spawn.spawnCreep(body, cand.name, {
                    memory: { role: 'harvester', born: Game.time, room: spawn.room.name },
                    dryRun: true,
                }) === OK
            ) {
                const result = spawn.spawnCreep(body, cand.name, {
                    memory: { role: 'harvester', born: Game.time, room: spawn.room.name },
                });
                if (result === OK) {
                    Names.commitCreep(cand.base, cand.name, 'harvester');
                    Log.info(
                        'Bootstrap harvester: ' + cand.name + ' at ' + spawn.name,
                        spawn.room.name
                    );
                    continue;
                }
            }
        }

        // 2) Prioritize a worker when none exist (prevents energy starvation)
        // Only consider harvester until at least one miner/harvester is alive
        const rolesIter = workersPresent ? roleNames : ['harvester'];

        for (const role of rolesIter) {
            const creepsWithRole = _.filter(Game.creeps, (c) => c.memory.role === role);
            // Override: when no workers present, ensure at least one harvester target
            const targetCount = !workersPresent && role === 'harvester' ? 1 : desiredCounts[role];
            if (creepsWithRole.length < targetCount) {
                // Body selection: prefer something we can afford now to keep momentum
                const body = affordableBody(role, spawn.room);
                // Get a unique, catalog-based name candidate; commit only on success
                const cand = Names.candidate(role);
                const newName = cand.name;
                // Try dry-run first to avoid noisy failures; then spawn for real
                const can = spawn.spawnCreep(body, newName, {
                    memory: { role: role, born: Game.time, room: spawn.room.name },
                    dryRun: true,
                });
                if (can !== OK) {
                    // If we’re starving for energy on a dependency role, try cheapest worker
                    if (!workersPresent && role !== 'harvester') continue;
                    if (role === 'hauler' && !haulersPresent && (countByRole.miner || 0) > 0) {
                        // ensure at least one hauler exists when miners do
                        const cheap = minimalBody('hauler');
                        const canHaul = spawn.spawnCreep(cheap, newName, {
                            memory: { role: 'hauler', born: Game.time, room: spawn.room.name },
                            dryRun: true,
                        });
                        if (canHaul !== OK) continue;
                        const resH = spawn.spawnCreep(cheap, newName, {
                            memory: { role: 'hauler', born: Game.time, room: spawn.room.name },
                        });
                        if (resH === OK) {
                            Names.commitCreep(cand.base, newName, 'hauler');
                            Log.info(
                                'Spawning hauler: ' + newName + ' at ' + spawn.name,
                                spawn.room.name
                            );
                        }
                        continue;
                    }
                    continue;
                }
                const result = spawn.spawnCreep(body, newName, {
                    memory: { role: role, born: Game.time, room: spawn.room.name },
                });
                // Spawn handler
                if (result === OK) {
                    Names.commitCreep(cand.base, newName, role);
                    Log.info(
                        'Spawning ' + role + ': ' + newName + ' at ' + spawn.name,
                        spawn.room.name
                    );
                } else if (result !== ERR_BUSY && result !== ERR_NOT_ENOUGH_ENERGY) {
                    // Dedup repeated failures until the code changes
                    const G = require('helper.guidance');
                    Log.onChange(
                        'spawn.fail.' + spawn.name + '.' + role,
                        result,
                        () =>
                            G.warn(
                                'Spawn failed for ' + role + ' (' + result + ')',
                                [
                                    'Ensure spawn has energy and is not busy.',
                                    'Validate body parts vs room energy capacity.',
                                    'Check role code for early exceptions.',
                                ],
                                {
                                    room: spawn.room.name,
                                    spawn: spawn.name,
                                    file: 'manager.spawner.js',
                                },
                                'SPAWN_FAIL'
                            ),
                        spawn.room.name,
                        'warn'
                    );
                }
            }
        }

        // Lightweight visibility: log desired vs actual mix occasionally
        if (Game.time % 50 === 0) {
            try {
                const actual = _.mapValues(
                    _.groupBy(Game.creeps, (c) => c.memory.role),
                    (arr) => arr.length
                );
                Log.onChange(
                    'spawn.roleMix.' + spawn.room.name,
                    { desired: desiredCounts, actual: actual },
                    (v) =>
                        'Role mix ' +
                        spawn.room.name +
                        ' desired=' +
                        JSON.stringify(v.desired) +
                        ' actual=' +
                        JSON.stringify(v.actual),
                    spawn.room.name,
                    'info'
                );
            } catch (e) {
                void e;
            }
        }
    }
};
