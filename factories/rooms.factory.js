const { makeRoom } = require('./room.factory');
const { makeController } = require('./controller.factory');
const { makeStructure } = require('./structure.factory');
const { makeStore } = require('./store.factory');

/**
 * Create multiple room objects for Game.rooms
 * @param {string[]} names - Array of room names
 * @param {Object} opts - Optional: map of roomName to options for Room factory
 * @returns {Object} rooms - { roomName: Room(...), ... }
 */

function makeRooms(names, opts = {}) {
    const rooms = {};
    const defaultRoom = {
        find: () => [],
        controller: makeController(),
        storage: makeStructure('storage', { store: makeStore({ energy: 100 }) }),
        energyAvailable: 300,
        energyCapacityAvailable: 300,
        memory: {},
        // add other common fields as needed
    };
    for (const name of names) {
        // Compose controller, storage, and store using factories if not provided
        const custom = opts[name] || {};
        const roomOpts = {
            ...defaultRoom,
            ...custom,
            controller: custom.controller || defaultRoom.controller,
            storage: custom.storage || defaultRoom.storage,
        };
        rooms[name] = makeRoom(name, roomOpts);
    }
    return rooms;
}

/**
 * Generate a block of room names (e.g., W1N1, W1N2, ...)
 * @param {number} size - Number of rooms per axis (e.g., 3 for 3x3)
 * @param {Object} opts - Optional: map of roomName to options
 * @returns {Object} rooms - { roomName: Room(...), ... }
 */
function makeRoomBlock(size = 16, opts = {}) {
    const names = [];
    for (let x = 1; x <= size; x++) {
        for (let y = 1; y <= size; y++) {
            names.push(`W${x}N${y}`);
        }
    }
    return makeRooms(names, opts);
}

/**
 * Generate randomized room options for fuzz testing
 * @returns {Object} opts - map of roomName to options
 */
function randomRoomOpts(names) {
    const opts = {};
    names.forEach((name) => {
        opts[name] = {
            energyAvailable: Math.floor(Math.random() * 600),
            energyCapacityAvailable: 200 + Math.floor(Math.random() * 800),
            controller: makeController(`ctl-${name}`, { level: Math.ceil(Math.random() * 8) }),
            storage: makeStructure('storage', {
                store: makeStore({ energy: Math.floor(Math.random() * 2000) }),
            }),
            memory: {},
        };
    });
    return opts;
}

/**
 * Filter rooms by RCL (controller level)
 * @param {Object} rooms - { roomName: Room(...), ... }
 * @param {number} minRCL - Minimum controller level
 * @returns {Object} filteredRooms
 */
function filterRoomsByRCL(rooms, minRCL = 1) {
    const filtered = {};
    for (const name in rooms) {
        const room = rooms[name];
        if (room.controller && room.controller.level >= minRCL) {
            filtered[name] = room;
        }
    }
    return filtered;
}

module.exports = {
    makeRooms,
    makeRoomBlock,
    randomRoomOpts,
    filterRoomsByRCL,
};
