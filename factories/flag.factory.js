const { makePosition } = require('./position.factory');
const { makeRoom } = require('./room.factory');

function makeFlag(name = 'Flag1', opts = {}) {
    return {
        name,
        color: opts.color || 1,
        secondaryColor: opts.secondaryColor || 2,
        pos: opts.pos || makePosition(),
        room: opts.room || makeRoom('W1N1'),
        remove: jest.fn(opts.remove || (() => {})),
        setColor: jest.fn(opts.setColor || (() => {})),
        setPosition: jest.fn(opts.setPosition || (() => {})),
        ...opts.extra,
    };
}

module.exports = { makeFlag };
