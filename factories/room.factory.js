const { makeVisual } = require('./visual.factory');

function makeRoom(name, opts = {}) {
    return {
        name,
        find: opts.find || jest.fn(() => []),
        visual: opts.visual || makeVisual(),
        storage: opts.storage || undefined,
        controller: opts.controller || undefined,
        energyAvailable: opts.energyAvailable ?? 300,
        energyCapacityAvailable: opts.energyCapacityAvailable ?? 300,
        memory: opts.memory || {},
        ...opts.extra,
    };
}

module.exports = { makeRoom };
