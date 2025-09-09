function makeService(type = 'creeps', opts = {}) {
    return {
        type,
        run: jest.fn(opts.run || (() => {})),
        plan: jest.fn(opts.plan || (() => {})),
        sweep: jest.fn(opts.sweep || (() => {})),
        flush: jest.fn(opts.flush || (() => {})),
        metrics: opts.metrics || {},
        error: jest.fn(opts.error || (() => {})),
        ...opts.extra,
    };
}

module.exports = { makeService };
