/* eslint-env screeps */
// util.heartbeat.js — readable per-tick heartbeat with role mix summary
const Logger = require('util.logger');

// Format role counts as: "harvester×3 | hauler×2 | builder×1"
function roleEmoji(role) {
    switch (role) {
        case 'harvester':
            return '🌾';
        case 'hauler':
            return '📦';
        case 'builder':
            return '🏗️';
        case 'upgrader':
            return '🔨';
        case 'miner':
            return '⛏️';
        case 'healer':
            return '❤️';
        case 'repairer':
            return '🔨';
        default:
            return '❓';
    }
}

function formatRoleLines(counts) {
    const entries = Object.keys(counts)
        .map((k) => [k, counts[k]])
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    if (!entries.length) return ['  none'];
    return entries.map(([role, n]) => '  ' + roleEmoji(role) + ' ' + role + ' × ' + n);
}

// Format seconds into y/w/d/h/m/s (omit zero units, keep at least seconds)
function formatDuration(seconds) {
    var s = Math.max(0, Math.floor(seconds || 0));
    var Y = 365 * 24 * 3600;
    var W = 7 * 24 * 3600;
    var D = 24 * 3600;
    var H = 3600;
    var M = 60;
    var y = Math.floor(s / Y);
    s -= y * Y;
    var w = Math.floor(s / W);
    s -= w * W;
    var d = Math.floor(s / D);
    s -= d * D;
    var h = Math.floor(s / H);
    s -= h * H;
    var m = Math.floor(s / M);
    s -= m * M;
    var parts = [];
    if (y) parts.push(y + 'y');
    if (w) parts.push(w + 'w');
    if (d) parts.push(d + 'd');
    if (h) parts.push(h + 'h');
    if (m) parts.push(m + 'm');
    parts.push(s + 's'); // always include seconds
    return parts.join(' ');
}

module.exports = {
    run() {
        // Heartbeat every 100 ticks
        Logger.every(
            100,
            () => {
                const counts = _.countBy(
                    Object.values(Game.creeps),
                    (c) => c.memory.role || 'unknown'
                );
                const total = Object.values(counts).reduce((a, b) => a + b, 0);
                const room = Object.keys(Game.rooms)[0] || 'noroom';
                // Track first-seen tick once; use it as "join" tick
                if (Memory.__joinTick == null) Memory.__joinTick = Game.time;
                const joinTick = Memory.__joinTick;
                const uptimeTicks = Game.time - joinTick;
                // Seconds per tick: allow override via Memory.settings.uptimeSecondsPerTick (default ~3s)
                var spt = (Memory && Memory.settings && Memory.settings.uptimeSecondsPerTick) || 3;
                if (typeof spt !== 'number' || spt <= 0) spt = 3;
                const uptimeHuman = formatDuration(uptimeTicks * spt);
                const roleLines = formatRoleLines(counts);
                return (
                    `\n` +
                    '🏠 Room: ' +
                    room +
                    '\n' +
                    '⏱ Uptime: ' +
                    uptimeHuman +
                    '\n' +
                    '📅 Since: ' +
                    joinTick +
                    '\n' +
                    '👥 Total: ' +
                    total +
                    '\n' +
                    '🧩 Mix:\n' +
                    roleLines.join('\n')
                );
            },
            '❤️ Heartbeat'
        );

        // Snapshot on change (dedup noisy logs)
        const counts = _.countBy(Object.values(Game.creeps), (c) => c.memory.role || 'unknown');
        const roomKey = Object.keys(Game.rooms)[0] || 'noroom';
        Logger.onChange(
            'heartbeat.roles.' + roomKey,
            counts,
            function (v) {
                const totalNow = Object.values(v).reduce(function (a, b) {
                    return a + b;
                }, 0);
                const lines = formatRoleLines(v);
                return (
                    `\n` + '🧩 Roles changed:\n' + lines.join('\n') + '\n' + '👥 Total: ' + totalNow
                );
            },
            '❤️ Heartbeat',
            'info'
        );
    },
};
