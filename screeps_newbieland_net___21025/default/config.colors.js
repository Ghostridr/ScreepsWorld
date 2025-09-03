/* eslint-env screeps */
// Central color palette (hex codes) and logger markers.

var Colors = {};

// Palette (tweak here)
Colors.palette = {
    white: '#ffffff',
    black: '#111111',
    gray: '#888888',
    lightGray: '#bbbbbb',
    orange: '#ffaa00',
    yellow: '#ffff66',
    green: '#33cc66',
    blue: '#22aaff',
    cyan: '#00e0ff',
    purple: '#aa88ff',
    red: '#ff4444',
    pink: '#ff77aa',
    brown: '#a0522d',
};

// Logger severity markers
Colors.logging = {
    prefix: {
        error: '🛑',
        warn: '⚠️',
        info: 'ℹ️',
        debug: '🐛',
        trace: '🔎',
        log: '•',
    },
};

module.exports = Colors;
