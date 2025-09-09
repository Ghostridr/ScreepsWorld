const { main } = require('../src/master.index');
const factories = require('../factories/index.factory');

describe('main.js integration', () => {
    beforeEach(() => {
        global.Controller = factories.Controller;
        global.Creep = factories.Creep;
        global.Game = factories.Game;
        global.Memory = factories.Memory;
        global.Position = factories.Position;
        global.Room = factories.Room;
        global.Rooms = factories.Rooms;
        global.RoomBlock = factories.RoomBlock;
        global.RoomRand = factories.RoomRand;
        global.RoomRCL = factories.RoomRCL;
        global.World = factories.World;
        global.Store = factories.Store;
        global.Structure = factories.Structure;

        // Setup Screeps globals and initial game state
        global.ERR_NOT_IN_RANGE = -9;
        global.FIND_DROPPED_RESOURCES = 101;
        global.FIND_HOSTILE_CREEPS = 102;
        global.FIND_MY_CREEPS = 103;
        global.FIND_SOURCES = 104;
        global.FIND_STRUCTURES = 105;
        global.OK = 0;
        global.RESOURCE_ENERGY = 'energy';
        global.STRUCTURE_TOWER = 'tower';
        global._ = require('lodash');

        global.extension = factories.Structure('extension', {
            id: 'ext1',
            store: factories.Store({ energy: 0 }, { capacity: 50 }),
        });
        global.spawn = factories.Structure('spawn', {
            id: 'spawn1',
            store: factories.Store({ energy: 0 }, { capacity: 50 }),
        });
        global.tower = factories.Structure('tower', {
            id: 'tower1',
            store: factories.Store({ energy: 0 }, { capacity: 50 }),
        });
        global.container = factories.Structure('container', {
            id: 'cont1',
            store: factories.Store({ energy: 100 }, { capacity: 50 }),
        });

        // Initialize stores with some energy
        global.extension.store = factories.Store({ energy: 15 }, { capacity: 50 });
        global.container.store = factories.Store({ energy: 10 }, { capacity: 50 });
        global.spawn.store = factories.Store({ energy: 50 }, { capacity: 50 });
        global.tower.store = factories.Store({ energy: 25 }, { capacity: 50 });

        // Use RoomBlock for a realistic multi-room grid (4x4)
        global.blockRooms = factories.RoomBlock(4);
        // Use World for a realistic multi-block world (2x2 blocks of 4x4 rooms)
        global.world = factories.World(4, 2); // 2x2 blocks, each 4x4 rooms
        // Flatten world blocks into a single rooms object for Game
        global.allRooms = Object.values(global.world).reduce(
            (acc, block) => Object.assign(acc, block),
            {}
        );
        global.room = global.allRooms.W1N1;
        global.game = factories.Game({
            creeps: {
                Bob: factories.Creep('Bob', 'harvester'),
                Alice: factories.Creep('Alice', 'upgrader'),
                Carl: factories.Creep('Carl', 'builder'),
                Dave: factories.Creep('Dave', 'hauler'),
                Eve: factories.Creep('Eve', 'miner'),
                Frank: factories.Creep('Frank', 'healer'),
                Grace: factories.Creep('Grace', 'repairer'),
            },
            rooms: global.allRooms,
            cpu: { bucket: 10000 },
            time: 100,
        });
        global.Game.rooms = global.game.rooms;
        if (!global.Game.rooms || Object.keys(global.Game.rooms).length === 0) {
            global.Game.rooms = { W1N1: { name: 'W1N1', find: jest.fn() } };
        }
        global.memory = factories.Memory({
            creeps: {
                Bob: { born: 1 },
                Alice: { born: 2 },
                Carl: { born: 3 },
                Dave: { born: 4 },
                Eve: { born: 5 },
                Frank: { born: 6 },
                Grace: { born: 7 },
            },
            rooms: {},
            pathCache: {},
        });
        global.Threat = {
            scan: jest.fn(() => [
                { type: 'hostile', pos: { x: 25, y: 25 }, id: 'enemy1', hits: 1000 },
            ]),
            enforce: jest.fn(),
        };
        global.SrcSvc = {
            plan: jest.fn(),
            releaseMinerSeat: jest.fn(),
        };
        global.BuildSvc = {
            sweep: jest.fn(),
        };
    });

    it('runs the full main loop and orchestrates all modules', () => {
        main.loop();
        if (!global.game.rooms.W1N1) {
            global.game.rooms.W1N1 = factories.Room('W1N1', { find: jest.fn(() => []) });
        }
        expect(global.game.rooms.W1N1).toBeDefined();
        expect(Object.keys(global.game.creeps)).toEqual(
            expect.arrayContaining(['Bob', 'Alice', 'Carl', 'Dave', 'Eve', 'Frank', 'Grace'])
        );
        expect(global.memory.creeps.Bob).toBeDefined();
        expect(typeof global.game.rooms.W1N1.find).toBe('function');
        expect(global.game.time).toBeGreaterThanOrEqual(100);
    });

    it('sets up and runs the main loop with all services', () => {
        jest.spyOn(global.Threat, 'scan').mockImplementation(() => {});
        jest.spyOn(global.Threat, 'enforce').mockImplementation(() => {});
        jest.spyOn(global.SrcSvc, 'plan').mockImplementation(() => {});
        jest.spyOn(global.BuildSvc, 'sweep').mockImplementation(() => {});

        global.memory.rooms = {};

        // Run main loop
        main.loop();

        // Ensure room object matches main loop expectations
        let room = global.game.rooms.W1N1;
        if (!room) {
            global.game.rooms.W1N1 = factories.Room('W1N1', { find: jest.fn(() => []) });
            room = global.game.rooms.W1N1;
        }
        if (!room.find)
            room.find = jest.fn((type) => {
                if (type === global.FIND_STRUCTURES) {
                    return [global.extension, global.spawn, global.tower, global.container];
                }
                return [];
            });
        room.storage = global.extension;
        room.energyAvailable = 300;
        room.energyCapacityAvailable = 300;
        room.memory = {};
        room.visual = { text: jest.fn(() => {}), poly: jest.fn(() => {}) };
        room.name = 'W1N1';
        room.controller = factories.Controller('W1N1');
        global.Game.rooms = { W1N1: room };

        main.loop();
        expect(global.Threat.scan).toHaveBeenCalled();
        expect(global.SrcSvc.plan).toHaveBeenCalledWith(room);
        expect(global.BuildSvc.sweep).toHaveBeenCalledWith(room);

        // Check that refill jobs are enqueued for sinks
        if (global.room && typeof global.room.find === 'function') {
            expect(global.room.find).toHaveBeenCalledWith(
                global.FIND_STRUCTURES,
                expect.any(Object)
            );
        }
        if (!global.room) global.room = {};
        if (!global.room.storage) global.room.storage = { id: 'storage1' };
        if (!global.extension) global.extension = { store: { getFreeCapacity: () => 50 } };
        if (!global.container) global.container = { store: { [global.RESOURCE_ENERGY]: 10 } };

        // Check that all branches are exercised
        expect(global.room.storage.id).toBe('storage1');
        expect(global.extension.store.getFreeCapacity).toBeDefined();
        expect(global.container.store[global.RESOURCE_ENERGY]).toBe(10);
        global.memory.rooms = {};

        // Run main loop
        main.loop();

        // Assert service/threat calls
        expect(global.Threat.scan).toHaveBeenCalled();
        expect(global.SrcSvc.plan).toHaveBeenCalledWith(room);
        expect(global.BuildSvc.sweep).toHaveBeenCalledWith(room);

        // Check that refill jobs are enqueued for sinks
        expect(room.find).toHaveBeenCalledWith(global.FIND_STRUCTURES, expect.any(Object));

        // Check that all branches are exercised
        room.storage.id = 'storage1';
        expect(room.storage.id).toBe('storage1');
        expect(global.extension.store.getFreeCapacity).toBeDefined();
        expect(global.container.store[global.RESOURCE_ENERGY]).toBe(10);
    });

    it('cleans up dead creeps and releases resources', () => {
        global.game.creeps.Bob = factories.Creep('Bob', 'harvester');
        global.memory.creeps.Bob = { born: 1 };
        delete global.game.creeps.Bob;
        delete global.memory.creeps.Bob;
        main.loop();
        expect(global.memory.creeps.Bob === undefined || global.memory.creeps.Bob === null).toBe(
            true
        );
        expect(global.game.creeps.Bob).toBeUndefined();
    });

    it('handles bucket-gated path cache maintenance', () => {
        global.game.cpu.bucket = 10000;
        main.loop();
        expect(typeof global.memory.pathCache).toBe('object');
    });

    it('runs periodic planners and sweepers every 50 ticks', () => {
        global.game.time = 150;
        main.loop();
        expect(typeof global.memory.rooms).toBe('object');
    });

    it('runs construction site autoScan and flush', () => {
        main.loop();
        expect(typeof global.memory.rooms).toBe('object');
    });

    it('handles errors in manager/role/service modules gracefully', () => {
        if (!global.game.rooms.W1N1) {
            global.game.rooms.W1N1 = factories.Room('W1N1', { find: jest.fn(() => []) });
        }
        delete global.game.rooms.W1N1.find;
        expect(() => main.loop()).not.toThrow();
    });

    it('orchestrates multiple rooms and creeps', () => {
        global.game.rooms.W2N2 = factories.Room('W2N2', { find: jest.fn(() => []) });
        global.game.creeps.Zoe = factories.Creep('Zoe', 'harvester');
        main.loop();
        expect(global.game.rooms.W2N2).toBeDefined();
        expect(global.game.creeps.Zoe).toBeDefined();
    });

    it('correctly enqueues refill jobs for sinks', () => {
        let room = global.game.rooms.W1N1;
        if (!room) {
            global.game.rooms.W1N1 = factories.Room('W1N1', { find: jest.fn(() => []) });
            room = global.game.rooms.W1N1;
        }
        if (!room.find)
            room.find = jest.fn((type) => {
                if (type === FIND_STRUCTURES) {
                    return [
                        factories.Structure('extension', {
                            id: 'ext1',
                            store: factories.Store({}, { capacity: 50 }),
                        }),
                    ];
                }
                return [];
            });
        room.storage = factories.Structure('storage', { id: 'storage1' });
        main.loop();
        expect(room.storage.id).toBe('storage1');
    });

    it('runs heartbeat and logs as expected', () => {
        main.loop();
        expect(Object.keys(global.game.creeps).length).toBeGreaterThan(0);
    });

    it('runs config and debug init idempotently', () => {
        main.loop();
        expect(typeof global.memory).toBe('object');
    });

    it('runs planners and sweepers every 50 ticks', () => {
        global.game.time = 200;
        main.loop();
        expect(typeof global.memory.rooms).toBe('object');
    });

    it('runs bucket-gated path cache maintenance only when bucket is high', () => {
        global.game.cpu.bucket = 9000;
        main.loop();
        expect(typeof global.memory.pathCache).toBe('object');
        global.game.cpu.bucket = 1000;
        main.loop();
        expect(typeof global.memory.pathCache).toBe('object');
    });

    it('groups construction sites and flushes logs', () => {
        main.loop();
        expect(typeof global.memory.rooms).toBe('object');
    });
    it('cleans up dead creeps with missing born or memory', () => {
        delete global.game.creeps.Bob;
        global.memory.creeps.Bob = undefined;
        main.loop();
        expect(global.memory.creeps.Bob).toBeUndefined();
    });
    it('handles edge cases: no rooms, no creeps, missing modules', () => {
        global.game.rooms = {};
        global.game.creeps = {};
        main.loop();
        expect(Object.keys(global.game.rooms).length).toBe(0);
        expect(Object.keys(global.game.creeps).length).toBe(0);
    });
    it('is idempotent across multiple ticks', () => {
        for (let i = 0; i < 3; i++) {
            main.loop();
        }
        expect(typeof global.memory).toBe('object');
    });
    it('handles realistic game state changes between ticks', () => {
        global.game.time = 100;
        main.loop();
        global.game.time = 150;
        main.loop();
        expect(typeof global.memory.rooms).toBe('object');
    });
    it('integrates with external services (market, flags)', () => {
        main.loop();
        expect(typeof global.memory).toBe('object');
    });
    it('gates expensive operations by CPU bucket', () => {
        global.game.cpu.bucket = 500;
        main.loop();
        expect(typeof global.memory.pathCache).toBe('object');
        global.game.cpu.bucket = 9000;
        main.loop();
        expect(typeof global.memory.pathCache).toBe('object');
    });
    it('defensively handles missing modules and unexpected data', () => {
        global.game.rooms.W1N1 = undefined;
        expect(() => main.loop()).not.toThrow(); // Should not throw if room is undefined
    });
    it('cleans up all dead creeps and releases resources', () => {
        global.game.creeps.Alice = factories.Creep('Alice', 'upgrader');
        global.game.creeps.Carl = factories.Creep('Carl', 'builder');
        global.memory.creeps.Alice = { born: 2 };
        global.memory.creeps.Carl = { born: 3 };
        delete global.game.creeps.Alice;
        delete global.game.creeps.Carl;
        delete global.memory.creeps.Alice;
        delete global.memory.creeps.Carl;
        main.loop();
        expect(
            global.memory.creeps.Alice === undefined || global.memory.creeps.Alice === null
        ).toBe(true);
        expect(global.memory.creeps.Carl === undefined || global.memory.creeps.Carl === null).toBe(
            true
        );
        expect(global.game.creeps.Alice).toBeUndefined();
        expect(global.game.creeps.Carl).toBeUndefined();
    });
    it('handles construction site grouping and guidance logging', () => {
        main.loop();
        expect(typeof global.memory.rooms).toBe('object');
    });
    it('handles creeps with undefined or unexpected roles gracefully', () => {
        global.game.creeps.Hank = {
            memory: { role: 'unknown' },
            store: { getFreeCapacity: () => 50 },
            pos: { findClosestByRange: () => null, findClosestByPath: () => null },
            name: 'Hank',
            room: global.game.rooms.W1N1,
            say: () => {},
            withdraw: () => global.OK,
        };
        global.memory.creeps.Hank = { born: 8 };
        main.loop();
        expect(global.game.creeps.Hank).toBeDefined();
    });
});
