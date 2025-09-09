const { makePosition } = require('./position.factory');
const { makeRoom } = require('./room.factory');
const { makeStore } = require('./store.factory');

function makeCreep(name, role, opts = {}) {
    return {
        memory: { role, ...opts.memory },
        store: opts.store || makeStore(),
        pos: opts.pos || makePosition(),
        name,
        room: opts.room || makeRoom('W1N1'),
        say: jest.fn(opts.say || (() => {})),
        withdraw: jest.fn(opts.withdraw || (() => global.OK)),
        moveTo: jest.fn(opts.moveTo || (() => global.OK)),
        transfer: jest.fn(opts.transfer || (() => global.OK)),
        harvest: jest.fn(opts.harvest || (() => global.OK)),
    };
}

module.exports = { makeCreep };
