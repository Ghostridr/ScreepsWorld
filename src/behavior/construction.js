/* eslint-env screeps */
// service.construction.js — Centralized construction-site prioritization (room-scoped)
// Single responsibility: pick the best next site for builders using a stepwise ladder.

// Priority order (early game biased). Use string structureType names to avoid global redeclare issues.
const PRIORITY = [
    'spawn',
    'road',
    'container',
    'extension',
    'rampart',
    'constructedWall',
    'tower',
    'storage',
    'link',
    'terminal',
    'lab',
    'factory',
];

function nearestRangeToSpawns(room, pos) {
    const spawns = Object.values(Game.spawns).filter((s) => s.room && s.room.name === room.name);
    if (!spawns.length) return 0;
    let best = Infinity;
    for (const s of spawns) {
        const d = s.pos.getRangeTo(pos);
        if (d < best) best = d;
    }
    return best;
}

function pickFromList(room, list) {
    // Tie-breakers: 1) less remaining work, 2) closer to a spawn
    list.sort((a, b) => {
        const ra = (a.progressTotal || 0) - (a.progress || 0);
        const rb = (b.progressTotal || 0) - (b.progress || 0);
        if (ra !== rb) return ra - rb;
        return nearestRangeToSpawns(room, a.pos) - nearestRangeToSpawns(room, b.pos);
    });
    return list[0] || null;
}

module.exports = {
    // pick(room[, skip]): ConstructionSite | null
    // Implements a ladder: check highest-priority type; if any → pick one and stop; else go next.
    // Optional skip = Set/Array of site IDs to ignore (e.g., claimed by another creep).
    pick(room, skip) {
        const skipSet = skip
            ? skip instanceof Set
                ? skip
                : new Set(Array.isArray(skip) ? skip : [skip])
            : null;
        const all = room.find(FIND_CONSTRUCTION_SITES);
        if (!all.length) return null;
        for (const type of PRIORITY) {
            const typed = all.filter(
                (c) => c.structureType === type && (!skipSet || !skipSet.has(c.id))
            );
            if (!typed.length) continue;
            return pickFromList(room, typed);
        }
        // Fallback: if no known types matched, pick any remaining (stable order by remaining work)
        const rest = all.filter((c) => !skipSet || !skipSet.has(c.id));
        return pickFromList(room, rest);
    },
    priorities() {
        return PRIORITY.slice();
    },
};
