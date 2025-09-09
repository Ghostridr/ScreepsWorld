const factory = require('./index.factory');

function makeResource(type = 'energy', opts = {}) {
    return {
        id: opts.id || 'resource1',
        resourceType: type,
        amount: opts.amount || 100,
        pos: opts.pos || factory.position(),
        room: opts.room || factory.room('W1N1'),
        toString: jest.fn(() => `[Resource ${type}]`),
        isActive: jest.fn(() => true),
        ...opts.extra,
    };
}

module.exports = { makeResource };
