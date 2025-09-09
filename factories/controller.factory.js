function makeController(id = 'ctl1', opts = {}) {
    return {
        id,
        pos: opts.pos || { x: 25, y: 25, roomName: 'W1N1' },
        my: opts.my !== undefined ? opts.my : true,
        owner: opts.owner || { username: 'Player' },
        level: opts.level || 8,
        ticksToDowngrade: opts.ticksToDowngrade || 20000,
    };
}

module.exports = { makeController };
