// Jest unit tests for src/service/auto.detect.js
const Threat = require('../../src/service/auto.detect');

describe('Auto Detect module', () => {
    let room, creep, hostile, pos, memoryBackup, gameBackup;

    beforeEach(() => {
        // Mock Memory and Game
        memoryBackup = global.Memory;
        gameBackup = global.Game;
        global.Memory = { rooms: {} };
        global.Game = { rooms: {} };

        // Mock Screeps global constants used in auto.detect.js
        global.FIND_HOSTILE_CREEPS = 1;
        global.FIND_MY_SPAWNS = 2;
        global.FIND_MY_CREEPS = 3;
        global.ROOM_TERRAIN_PLAIN = 0;
        global.ROOM_TERRAIN_SWAMP = 1;
        global.ROOM_TERRAIN_WALL = 2;
        global.TERRAIN_MASK_WALL = 1;
        global.RoomPosition = function (x, y, roomName) {
            return {
                x,
                y,
                roomName,
                getRangeTo: jest.fn(() => 5),
                isEqualTo: function (other) {
                    return (
                        other &&
                        this.x === other.x &&
                        this.y === other.y &&
                        this.roomName === other.roomName
                    );
                },
            };
        };

        // Mock Room, Creep, RoomPosition, etc.
        pos = new RoomPosition(10, 10, 'W1N1');
        hostile = { id: 'h1', pos, getRangeTo: jest.fn(() => 5) };
        room = {
            name: 'W1N1',
            find: jest.fn((type) => {
                if (type === FIND_HOSTILE_CREEPS) return [hostile];
                if (type === FIND_MY_SPAWNS) return [{ pos }];
                if (type === FIND_MY_CREEPS) return [creep];
                return [];
            }),
            getTerrain: () => ({ get: () => 0 }),
            controller: { pos },
        };
        creep = {
            pos,
            room,
            moveByPath: jest.fn(),
            moveTo: jest.fn(),
            move: jest.fn(),
            memory: {},
        };
        global.Game.rooms['W1N1'] = room;
    });

    afterEach(() => {
        global.Memory = memoryBackup;
        global.Game = gameBackup;
    });

    describe('Threat module', () => {
        describe('scan', () => {
            it('updates threat memory', () => {
                Threat.scan(room);
                expect(global.Memory.rooms['W1N1'].threat).toBeDefined();
                expect(global.Memory.rooms['W1N1'].threat.active).toBe(true);
            });

            it('clears threat when no hostiles', () => {
                room.find = jest.fn((type) => (type === FIND_HOSTILE_CREEPS ? [] : []));
                Threat.scan(room);
                expect(global.Memory.rooms['W1N1'].threat.active).toBe(false);
            });

            it('handles invalid room gracefully', () => {
                expect(() => Threat.scan(null)).not.toThrow();
            });
        });

        describe('enforce', () => {
            it('calls retreat on creeps in danger', () => {
                Threat.scan(room);
                creep.pos.getRangeTo = jest.fn(() => 5); // within danger radius
                Threat.enforce(room);
                expect(
                    creep.moveByPath.mock.calls.length +
                        creep.moveTo.mock.calls.length +
                        creep.move.mock.calls.length
                ).toBeGreaterThan(0);
            });

            it('does not move creeps out of danger', () => {
                Threat.scan(room);
                creep.pos.getRangeTo = jest.fn(() => 20); // out of danger
                Threat.enforce(room);
                expect(creep.moveByPath).not.toHaveBeenCalled();
            });

            it('handles missing properties in threat', () => {
                if (!global.Memory.rooms['W1N1']) global.Memory.rooms['W1N1'] = {};
                global.Memory.rooms['W1N1'].threat = {};
                expect(() => Threat.enforce(room)).not.toThrow();
            });

            it('handles invalid room gracefully', () => {
                expect(() => Threat.enforce(null)).not.toThrow();
            });
        });

        describe('isDanger', () => {
            it('returns true for positions in danger', () => {
                Threat.scan(room);
                expect(Threat.isDanger(pos, 'W1N1')).toBe(true);
            });

            it('returns false for positions out of danger', () => {
                Threat.scan(room);
                expect(Threat.isDanger({ ...pos, getRangeTo: () => 20 }, 'W1N1')).toBe(false);
            });
        });
    });
});
