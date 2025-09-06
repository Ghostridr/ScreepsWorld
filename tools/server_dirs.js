// server_dirs.js
// Central list of server root folder names for deployment tools
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC = path.resolve(__dirname, '..', 'src');

module.exports = {
    SERVER_DIRS: [
        'screeps.com',
        'screeps_newbieland_net___21025',
        // add more server root folder names here (only the folder name)
    ],
    ROOT,
    SRC,
};
