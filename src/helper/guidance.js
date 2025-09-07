/* eslint-env screeps */
// helper.guidance.js — Consistent, concise guidance blocks for warnings/errors/info.
// Goal: human-scannable console output with clear next steps and where-to-look.
// Usage:
//   const G = require('helper.guidance');
//   const msg = G.build({
//     summary: 'Spawn failed (ERR_INVALID_ARGS)',
//     tips: ['Check body parts vs room energy capacity', 'Validate role module exports'],
//     where: { file: 'manager.spawner.js', room: room.name, spawn: spawn.name },
//     ref: 'SPAWN_FAIL',
//   });
//   Log.warn(msg, 'spawn');
//
// Notes:
// - Keep output compact; avoid noisy JSON unless helpful.
// - Stable shape; future-proof fields (ref, context) without breaking callers.

const G = module.exports;
const CATALOG = (function () {
    try {
        return require('catalog.guidance');
    } catch (err) {
        void err;
        return {};
    }
})();

// Join helper
function j(x) {
    return Array.isArray(x) ? x.filter(Boolean).map(String) : x ? [String(x)] : [];
}

// Format a key:value context line sorted for stability
function fmtWhere(where) {
    if (!where) return null;
    if (typeof where === 'string') return 'Where: ' + where;
    try {
        const entries = Object.entries(where).filter(([, v]) => v != null);
        entries.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
        const parts = entries.map(([k, v]) => k + '=' + v);
        return 'Where: ' + parts.join(' ');
    } catch (err) {
        void err;
        return 'Where: ' + String(where);
    }
}

// Replace tokens like {{room}} or {{role}} in a string with values from ctx
function interpolate(str, ctx) {
    if (!str || !ctx) return str;
    return String(str).replace(/\{\{(\w+)\}\}/g, function (_, k) {
        return ctx[k] != null ? String(ctx[k]) : '{{' + k + '}}';
    });
}

// Build a consistent guidance block
// opts: { summary?: string, tips?: string|string[], where?: string|object, ref?: string, extra?: string|string[], tokens?: object }
G.build = function build(opts) {
    const lines = [];
    const cfg = opts && opts.ref && CATALOG[opts.ref] ? CATALOG[opts.ref] : null;
    const tokens = (opts && opts.tokens) || {};
    const summary = (opts && opts.summary) || (cfg && cfg.summary) || null;
    if (summary) lines.push(interpolate(summary, tokens));
    const tips = j((opts && opts.tips) || (cfg && cfg.tips));
    if (tips.length) {
        lines.push('How to resolve:');
        for (const t of tips) lines.push(' - ' + interpolate(t, tokens));
    }
    const whereLine = fmtWhere(opts && opts.where);
    if (whereLine) lines.push(whereLine);
    const extra = j(opts && opts.extra);
    for (const e of extra) lines.push(e);
    if (opts && opts.ref) lines.push('Ref: ' + String(opts.ref));
    return lines.join('\n');
};

// Convenience wrappers
G.warn = function (summary, tips, where, ref, tokens) {
    return G.build({ summary, tips, where, ref, tokens });
};
G.error = function (summary, tips, where, ref, tokens) {
    return G.build({ summary, tips, where, ref, tokens });
};
G.info = function (summary, tips, where, ref, tokens) {
    return G.build({ summary, tips, where, ref, tokens });
};
