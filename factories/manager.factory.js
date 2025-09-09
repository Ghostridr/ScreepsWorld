function makeManager(type = 'spawner', opts = {}) {
    return {
        type,
        run: jest.fn(opts.run || (() => {})),
        plan: jest.fn(opts.plan || (() => {})),
        sweep: jest.fn(opts.sweep || (() => {})),
        metrics: opts.metrics || {},
        error: jest.fn(opts.error || (() => {})),
        ...opts.extra,
    };
}

module.exports = { makeManager };
