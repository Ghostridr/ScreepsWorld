function makeMemory(opts = {}) {
    return {
        creeps: opts.creeps || {},
        rooms: opts.rooms || {},
        stats: opts.stats || {},
        pathCache: opts.pathCache || {},
        queues: opts.queues || {},
        error: jest.fn(opts.error || (() => {})),
        ...opts.extra,
    };
}
module.exports = { makeMemory };
