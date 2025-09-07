/* eslint-env screeps */
// Central color palette (hex codes) and logger markers.

var Colors = {};

// Palette (tweak here)
Colors.palette = {
    black: '#111111',
    blue: '#22aaff',
    brown: '#a0522d',
    cyan: '#00e0ff',
    gray: '#888888',
    green: '#33cc66',
    lightGray: '#bbbbbb',
    orange: '#ffaa00',
    pink: '#ff77aa',
    purple: '#aa88ff',
    red: '#ff4444',
    white: '#ffffff',
    yellow: '#ffff66',
};

// Logger severity markers
Colors.logging = {
    prefix: {
        debug: '🐛',
        error: '🛑',
        info: 'ℹ️',
        log: '•',
        trace: '🔎',
        warn: '⚠️',
    },
};

module.exports = Colors;
