const { makeRoomBlock } = require('./rooms.factory');

/**
 * Create a Screeps world with multiple room blocks
 * @param {number} blockSize - Size of each block (default 9)
 * @param {number} numBlocks - Number of blocks (default 16)
 * @param {Object} opts - Optional: map of roomName to options for each block
 * @returns {Object} world - { blockIndex: { roomName: Room(...) }, ... }
 */
function makeWorld(blockSize = 4, blocksPerAxis = 4, opts = {}) {
    const world = {};
    for (let bx = 0; bx < blocksPerAxis; bx++) {
        for (let by = 0; by < blocksPerAxis; by++) {
            // Offset room names for each block
            // Each block is a 4x4 grid, so room names start at W{1+bx*blockSize}N{1+by*blockSize}
            const names = [];
            for (let x = 1 + bx * blockSize; x <= (bx + 1) * blockSize; x++) {
                for (let y = 1 + by * blockSize; y <= (by + 1) * blockSize; y++) {
                    names.push(`W${x}N${y}`);
                }
            }
            const blockOpts = opts[`${bx},${by}`] || {};
            world[`${bx},${by}`] = makeRoomBlock(names, blockOpts);
        }
    }
    return world;
}

module.exports = { makeWorld };
