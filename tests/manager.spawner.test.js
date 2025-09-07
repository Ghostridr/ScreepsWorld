/**
 * Jest tests for src/manager.spawner.js
 * Validates spawning behavior for all roles and edge cases.
 */

// Minimal lodash-like filter used by manager.spawner
global._ = {
    filter(collection, predicate) {
        return Object.values(collection || {}).filter(predicate);
    },
};

// Screeps constants used by the module
global.WORK = 'WORK';
global.CARRY = 'CARRY';
global.MOVE = 'MOVE';
global.OK = 0;

// Utility to create a Game mock
function makeGame({ creepsByRole = {}, spawnReturn = OK } = {}) {
    // Build Game.creeps from counts per role
    const creeps = {};
    Object.entries(creepsByRole).forEach(([role, count]) => {
        for (let i = 0; i < count; i++) {
            const name = `${role}${i + 1}`;
            creeps[name] = { name, memory: { role } };
        }
    });

    const spawn = {
        spawnCreep: jest.fn(() => spawnReturn),
    };

    return {
        Game: {
            time: 12345,
            creeps,
            spawns: { Spawn1: spawn },
        },
        spawn,
    };
}

describe('manager.spawner.loop', () => {
    let manager;

    beforeEach(() => {
        jest.resetModules();
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        console.log.mockRestore();
    });

    test('spawns one of each role when none exist (3 spawns)', () => {
        console.info('[spawner.test] START: spawns one of each role when none exist');
        const { Game, spawn } = makeGame({ creepsByRole: {} });
        global.Game = Game;

        manager = require('../src/manager.spawner');
        manager.loop();

        const callsCount = spawn.spawnCreep.mock.calls.length;
        console.info(`[spawner.test] spawn.spawnCreep call count: ${callsCount} (expected 3)`);
        expect(spawn.spawnCreep).toHaveBeenCalledTimes(3);

        // Bodies per role
        const calls = spawn.spawnCreep.mock.calls;
        const argsByRole = Object.fromEntries(
            calls.map(([body, name, opts]) => [opts.memory.role, { body, name, opts }])
        );

        console.info(
            `[spawner.test] harvester body: ${JSON.stringify(argsByRole.harvester.body)} (expected [WORK,CARRY,MOVE])`
        );
        console.info(
            `[spawner.test] upgrader body:  ${JSON.stringify(argsByRole.upgrader.body)} (expected [WORK,CARRY,MOVE,MOVE])`
        );
        console.info(
            `[spawner.test] builder body:   ${JSON.stringify(argsByRole.builder.body)} (expected [WORK,WORK,CARRY,MOVE])`
        );
        expect(argsByRole.harvester.body).toEqual([WORK, CARRY, MOVE]);
        expect(argsByRole.upgrader.body).toEqual([WORK, CARRY, MOVE, MOVE]);
        expect(argsByRole.builder.body).toEqual([WORK, WORK, CARRY, MOVE]);

        // Memory role set and name contains role + Game.time
        for (const role of ['harvester', 'upgrader', 'builder']) {
            expect(argsByRole[role].opts.memory.role).toBe(role);
            expect(argsByRole[role].name).toContain(role);
            expect(argsByRole[role].name).toContain(String(Game.time));
            console.info(
                `[spawner.test] ${role} -> name: ${argsByRole[role].name}, memory.role: ${argsByRole[role].opts.memory.role}`
            );
        }

        console.info('[spawner.test] END: spawns one of each role when none exist (PASS)');
    });

    test('does not spawn when desired counts are met (2 per role)', () => {
        console.info('[spawner.test] START: no spawn when counts are met');
        const { Game, spawn } = makeGame({
            creepsByRole: { harvester: 2, upgrader: 2, builder: 2 },
        });
        global.Game = Game;

        manager = require('../src/manager.spawner');
        manager.loop();

        const callsCount = spawn.spawnCreep.mock.calls.length;
        console.info(`[spawner.test] spawn.spawnCreep call count: ${callsCount} (expected 0)`);
        expect(spawn.spawnCreep).not.toHaveBeenCalled();
        console.info('[spawner.test] END: no spawn when counts are met (PASS)');
    });

    test('spawns only the missing role when partially under target', () => {
        console.info('[spawner.test] START: spawn only missing role');
        const { Game, spawn } = makeGame({
            creepsByRole: { harvester: 2, upgrader: 1, builder: 2 },
        });
        global.Game = Game;

        manager = require('../src/manager.spawner');
        manager.loop();

        const callsCount = spawn.spawnCreep.mock.calls.length;
        console.info(`[spawner.test] spawn.spawnCreep call count: ${callsCount} (expected 1)`);
        expect(spawn.spawnCreep).toHaveBeenCalledTimes(1);
        const [body, name, opts] = spawn.spawnCreep.mock.calls[0];
        console.info(`[spawner.test] spawned role: ${opts.memory.role} (expected upgrader)`);
        console.info(
            `[spawner.test] body: ${JSON.stringify(body)} (expected [WORK,CARRY,MOVE,MOVE])`
        );
        console.info(`[spawner.test] name: ${name} (should contain "upgrader")`);
        expect(opts.memory.role).toBe('upgrader');
        expect(body).toEqual([WORK, CARRY, MOVE, MOVE]);
        expect(name).toContain('upgrader');
        console.info('[spawner.test] END: spawn only missing role (PASS)');
    });
});
