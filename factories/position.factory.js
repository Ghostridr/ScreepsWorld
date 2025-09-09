function makePosition(opts = {}) {
    return {
        findClosestByRange: jest.fn(opts.findClosestByRange || (() => null)),
        findClosestByPath: jest.fn(opts.findClosestByPath || (() => null)),
        getRangeTo: jest.fn((target) => {
            if (target && target.x !== null && target.y !== null) {
                const dx = (opts.x || 0) - target.x;
                const dy = (opts.y || 0) - target.y;
                return Math.sqrt(dx * dx + dy * dy);
            }
            return opts.range || 10;
        }),
        x: opts.x || 0,
        y: opts.y || 0,
        roomName: opts.roomName || 'W1N1',
    };
}

module.exports = { makePosition };
