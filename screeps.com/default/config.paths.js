/* eslint-env screeps */
// Centralized visualizePathStyle presets for creeps/managers.

var Colors = require('config.colors');
var Config = (function () {
    try {
        return require('config.constants');
    } catch (e) {
        void e;
        return {};
    }
})();

// Single source of truth: read from config.constants (if present)
var _pathsCfg = (Config && Config.VISUALS && Config.VISUALS.paths) || null;
var Theme = {
    lineStyles: (_pathsCfg && _pathsCfg.style) || {},
    widthMode: (_pathsCfg && _pathsCfg.widthMode) || undefined,
    widths: (_pathsCfg && _pathsCfg.widths) || {},
    opacities: (_pathsCfg && _pathsCfg.opacities) || {},
    pulse: (_pathsCfg && _pathsCfg.pulse) || {},
};

function buildStyle(stroke, width, opacity, lineStyle) {
    var s = { stroke: stroke };
    if (typeof width === 'number') s.strokeWidth = width;
    if (typeof opacity === 'number') s.opacity = opacity;
    if (lineStyle) s.lineStyle = lineStyle; // 'dashed' | 'dotted'
    return s;
}

// Helper that applies Theme defaults by kind, with optional overrides
function makeStyle(kind, stroke, overrides) {
    var mode = Theme.widthMode || 'absolute';
    var haveBase = typeof Theme.widths.normal === 'number';
    var base = haveBase ? Theme.widths.normal : undefined;
    var hasRaw = typeof Theme.widths[kind] === 'number';
    var raw = hasRaw ? Theme.widths[kind] : undefined;
    var width = undefined;
    if (kind === 'normal') {
        width = base;
    } else if (hasRaw) {
        if (mode === 'delta' && haveBase) width = base + raw;
        else if (mode === 'multiplier' && haveBase) width = base * raw;
        else width = raw; // absolute or missing base
    }
    var opacity = typeof Theme.opacities[kind] === 'number' ? Theme.opacities[kind] : undefined;
    var lineStyle =
        Theme.lineStyles && Theme.lineStyles[kind] != null ? Theme.lineStyles[kind] : undefined;
    if (lineStyle === 'none') return undefined;
    if (overrides && overrides.lineStyle != null) lineStyle = overrides.lineStyle;
    if (overrides && overrides.width != null) width = overrides.width;
    if (overrides && overrides.opacity != null) opacity = overrides.opacity;
    // guard against invisible lines
    if (typeof width === 'number') width = Math.max(0.1, width);
    return buildStyle(stroke, width, opacity, lineStyle);
}

// Optional pulsing: adjust opacity/width smoothly by tick
function applyPulse(kind, style) {
    if (!style) return style;
    var cfg = Theme.pulse;
    if (!cfg || !cfg.enabled) return style;
    if (!cfg.kinds || !cfg.kinds[kind]) return style;
    var s = {
        stroke: style.stroke,
        strokeWidth: style.strokeWidth,
        opacity: style.opacity,
        lineStyle: style.lineStyle,
    };
    var period = cfg.period > 1 ? cfg.period : 30;
    var amp = cfg.amplitude >= 0 ? cfg.amplitude : 0.15;
    var wamp = cfg.widthAmplitude >= 0 ? cfg.widthAmplitude : 0;
    var t = typeof Game !== 'undefined' && Game && typeof Game.time === 'number' ? Game.time : 0;
    var wave = 0.5 + 0.5 * Math.sin((2 * Math.PI * (t % period)) / period);
    // Opacity pulse (clamped 0..1)
    if (typeof s.opacity === 'number') {
        var f = 1 - amp + amp * wave;
        s.opacity = Math.max(0, Math.min(1, s.opacity * f));
    }
    // Width pulse (gentle)
    if (typeof s.strokeWidth === 'number' && wamp > 0) {
        var fw = 1 - wamp + wamp * wave;
        s.strokeWidth = Math.max(0.1, s.strokeWidth * fw);
    }
    return s;
}

var P = {};

// Role path styles
// Define dynamic style objects via getters so visuals can change per tick
function defineStyleGetter(target, prop, kind, color, overrides) {
    Object.defineProperty(target, prop, {
        enumerable: true,
        configurable: false,
        get: function () {
            var base = makeStyle(kind, color, overrides);
            return applyPulse(kind, base);
        },
    });
}

function makeRoleStyles(map) {
    var o = {};
    for (var key in map) {
        if (!Object.prototype.hasOwnProperty.call(map, key)) continue;
        var spec = map[key];
        // spec: [kind, color, overrides?]
        defineStyleGetter(o, key, spec[0], spec[1], spec[2]);
    }
    return o;
}

P.roles = {
    harvester: makeRoleStyles({
        withdraw: ['normal', Colors.palette.yellow],
        harvest: ['normal', Colors.palette.orange],
        deliver: ['normal', Colors.palette.white],
        move: ['move', Colors.palette.green],
        blocked: ['blocked', Colors.palette.red],
    }),
    builder: makeRoleStyles({
        build: ['normal', Colors.palette.purple],
        harvest: ['normal', Colors.palette.orange],
        deliver: ['normal', Colors.palette.white],
        move: ['move', Colors.palette.blue],
        blocked: ['blocked', Colors.palette.red],
    }),
    upgrader: makeRoleStyles({
        upgrade: ['normal', Colors.palette.cyan],
        harvest: ['normal', Colors.palette.orange],
        deliver: ['normal', Colors.palette.white],
        move: ['move', Colors.palette.blue],
        blocked: ['blocked', Colors.palette.red],
    }),
    miner: makeRoleStyles({
        mine: ['normal', Colors.palette.orange],
        move: ['move', Colors.palette.orange],
        deliver: ['normal', Colors.palette.white],
        blocked: ['blocked', Colors.palette.red],
    }),
    hauler: makeRoleStyles({
        haul: ['normal', Colors.palette.green],
        move: ['move', Colors.palette.green],
        blocked: ['blocked', Colors.palette.red],
    }),
    healer: makeRoleStyles({
        heal: ['normal', Colors.palette.green],
        move: ['move', Colors.palette.green],
        blocked: ['blocked', Colors.palette.red],
    }),
};

// Manager/service path styles (planning visuals)
P.managers = {
    road: makeRoleStyles({
        planned: [
            'planningPlanned',
            Colors.palette.lightGray,
            { lineStyle: Theme.lineStyles.planning },
        ],
        built: ['planningBuilt', Colors.palette.gray],
    }),
    tower: makeRoleStyles({
        attack: ['tower', Colors.palette.red],
        heal: ['tower', Colors.palette.green],
        repair: ['tower', Colors.palette.yellow],
    }),
    layout: makeRoleStyles({
        container: ['layout', Colors.palette.cyan],
        extension: ['layout', Colors.palette.purple],
        storage: ['layout', Colors.palette.brown],
        link: ['layout', Colors.palette.blue],
    }),
};

// Optional: expose theme for advanced tweaking at runtime
P.theme = Theme;
P.setLineStyle = function (kind, style) {
    if (Object.prototype.hasOwnProperty.call(Theme.lineStyles, kind))
        Theme.lineStyles[kind] = style;
};

P.setWidth = function (kind, width) {
    if (typeof width !== 'number') return;
    if (Object.prototype.hasOwnProperty.call(Theme.widths, kind)) Theme.widths[kind] = width;
};

P.setOpacity = function (kind, op) {
    if (typeof op !== 'number') return;
    if (Object.prototype.hasOwnProperty.call(Theme.opacities, kind)) Theme.opacities[kind] = op;
};

// Helper: draw a gentle pulsing indicator when a creep is idle (no job)
// This mimics construction-site pulse: small, slow, opacity-based.
// Usage: if (!hasJob) Paths.drawIdle(creep)
P.drawIdle = function (creep, opts) {
    if (!creep || !creep.room || !creep.pos) return;
    var pulse = Theme.pulse || {};
    if (!pulse.enabled) return; // follow central gate
    var kinds = pulse.kinds || {};
    if (!kinds.idle) return; // only if centrally enabled

    var period = typeof pulse.period === 'number' && pulse.period > 1 ? pulse.period : 50;
    var amp = typeof pulse.amplitude === 'number' ? pulse.amplitude : 0.25;
    var t = typeof Game !== 'undefined' && Game && typeof Game.time === 'number' ? Game.time : 0;
    var wave = 0.5 + 0.5 * Math.sin((2 * Math.PI * (t % period)) / period);

    var baseOpacity = typeof Theme.opacities.idle === 'number' ? Theme.opacities.idle : 0.6;
    var opacity = Math.max(0, Math.min(1, baseOpacity * (1 - amp + amp * wave)));

    var stroke = (opts && opts.stroke) || Colors.palette.lightGray;
    var fill = (opts && opts.fill) || undefined;
    var radius = (opts && opts.radius) || 0.4;

    creep.room.visual.circle(creep.pos, {
        radius: radius,
        stroke: stroke,
        opacity: opacity,
        fill: fill,
    });
};

module.exports = P;
