function makeGame(opts = {}) {
    return {
        rooms: opts.rooms || {},
        creeps: opts.creeps || {},
        spawns: opts.spawns || {},
        time: opts.time || 100,
        cpu: opts.cpu || { bucket: 10000, getUsed: () => 10 },
        getObjectById: jest.fn(opts.getObjectById || (() => null)),
        map: opts.map || {},
        error: jest.fn(opts.error || (() => {})),
        ...opts.extra,
    };
}
module.exports = { makeGame };
