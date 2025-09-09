function makeRole(name = 'harvester', opts = {}) {
    return {
        name,
        run: jest.fn(opts.run || (() => {})),
        act: jest.fn(opts.act || (() => {})),
        metrics: opts.metrics || {},
        error: jest.fn(opts.error || (() => {})),
        ...opts.extra,
    };
}

module.exports = { makeRole };
