/**
 * Jest test for src/main.js
 * - Mocks Screeps role modules (harvester/upgrader/builder)
 * - Mocks global Game and a tower
 * - Verifies the loop dispatches roles and triggers tower actions
 */

// Mock role modules that main.js requires by name
const harvesterMock = { run: jest.fn() };
const upgraderMock = { run: jest.fn() };
const builderMock = { run: jest.fn() };

jest.mock('role.harvester', () => harvesterMock, { virtual: true });
jest.mock('role.upgrader', () => upgraderMock, { virtual: true });
jest.mock('role.builder', () => builderMock, { virtual: true });

// Provide minimal Screeps globals used by main.js
global.FIND_STRUCTURES = 'FIND_STRUCTURES';
global.FIND_HOSTILE_CREEPS = 'FIND_HOSTILE_CREEPS';

describe('main.loop', () => {
    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Mock a tower with basic behavior
        const tower = {
            pos: {
                findClosestByRange: jest.fn((type) => {
                    if (type === global.FIND_STRUCTURES) {
                        // Pretend we found a damaged structure
                        return { id: 'damaged-1', hits: 100, hitsMax: 200 };
                    }
                    if (type === global.FIND_HOSTILE_CREEPS) {
                        // Pretend we found a hostile
                        return { id: 'hostile-1' };
                    }
                    return null;
                }),
            },
            repair: jest.fn(() => 0),
            attack: jest.fn(() => 0),
        };

        // Global Game mock (only the parts main.js touches)
        global.Game = {
            getObjectById: jest.fn(() => tower),
            creeps: {
                H1: { name: 'H1', memory: { role: 'harvester' } },
                U1: { name: 'U1', memory: { role: 'upgrader' } },
                B1: { name: 'B1', memory: { role: 'builder' } },
            },
        };
    });

    test('dispatches roles and operates tower actions', () => {
        console.info('[main.test] START: dispatches roles and operates tower actions');
        const main = require('../src/main');

        expect(typeof main.loop).toBe('function');

        // Run one tick
        main.loop();

        // Role dispatch
        const hCalls = harvesterMock.run.mock.calls.length;
        const uCalls = upgraderMock.run.mock.calls.length;
        const bCalls = builderMock.run.mock.calls.length;
        console.info(`[main.test] role.harvester.run calls: ${hCalls} (expected 1)`);
        console.info(`[main.test] role.upgrader.run calls:  ${uCalls} (expected 1)`);
        console.info(`[main.test] role.builder.run calls:   ${bCalls} (expected 1)`);
        expect(harvesterMock.run).toHaveBeenCalledTimes(1);
        expect(upgraderMock.run).toHaveBeenCalledTimes(1);
        expect(builderMock.run).toHaveBeenCalledTimes(1);

        // Tower logic
        const tower = global.Game.getObjectById.mock.results[0].value;
        const repairCalls = tower.repair.mock.calls.length;
        const attackCalls = tower.attack.mock.calls.length;
        console.info(`[main.test] tower.repair calls: ${repairCalls} (expected 1)`);
        console.info(`[main.test] tower.attack calls: ${attackCalls} (expected 1)`);
        expect(tower.repair).toHaveBeenCalledTimes(1);
        expect(tower.attack).toHaveBeenCalledTimes(1);

        console.info('[main.test] END: dispatches roles and operates tower actions (PASS)');
    });
});
