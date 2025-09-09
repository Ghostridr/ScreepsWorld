// index.factory.js — Barrel for all test factories
// Purpose: Centralized, short-named exports for all factory functions. Use for test setup.
// Usage: const { Creep, Room, Store, ... } = require('../factories/index.factory');
module.exports = {
    Controller: require('./controller.factory').makeController,
    Creep: require('./creep.factory').makeCreep,
    Flag: require('./flag.factory').makeFlag,
    Game: require('./game.factory').makeGame,
    Manager: require('./manager.factory').makeManager,
    Memory: require('./memory.factory').makeMemory,
    Position: require('./position.factory').makePosition,
    Resource: require('./resource.factory').makeResource,
    Role: require('./role.factory').makeRole,
    Room: require('./room.factory').makeRoom,
    Rooms: require('./rooms.factory').makeRooms,
    RoomBlock: require('./rooms.factory').makeRoomBlock,
    RoomRand: require('./rooms.factory').randomRoomOpts,
    RoomRCL: require('./rooms.factory').filterRoomsByRCL,
    World: require('./world.factory').makeWorld,
    Service: require('./service.factory').makeService,
    Store: require('./store.factory').makeStore,
    Structure: require('./structure.factory').makeStructure,
    Visual: require('./visual.factory').makeVisual,
};
