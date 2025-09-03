// Name catalog and allocator for creeps (and future named entities)
// Contract:
// - Provide themed name lists per role
// - Offer a candidate name without committing Memory
// - Commit allocation only after a successful spawn
// - Release on creep death via releaseForCreep(name)

const Catalog = {
    harvester: [
        'Barley',
        'HarvestMoon',
        'Reaper',
        'Sickle',
        'Thresh',
        'Amber',
        'Barndoor',
        'Haystack',
        'Wheatley',
        'Sprout',
    ],
    upgrader: [
        'Tesla',
        'Ada',
        'Turing',
        'Hopper',
        'Linus',
        'Grace',
        'Lovelace',
        'Woz',
        'Torvalds',
        'Curie',
    ],
    builder: [
        'Mortar',
        'Brick',
        'Beam',
        'Chisel',
        'Keystone',
        'Stud',
        'Joist',
        'Mason',
        'Rafter',
        'Trowel',
    ],
    miner: [
        'Pickaxe',
        'Tunnel',
        'Drillbit',
        'Seam',
        'Orebus',
        'Quartz',
        'Basalt',
        'Flint',
        'Ridge',
        'Strike',
    ],
    hauler: [
        'Cart',
        'Wagon',
        'Mule',
        'Freight',
        'Depot',
        'Axle',
        'Towline',
        'Sled',
        'Crate',
        'Skid',
    ],
};

// Local fallback store for environments without Memory (e.g., Jest tests)
var _localStore = { assigned: { creep: {} }, byCreepName: {} };

function ensureRoot() {
    if (typeof Memory === 'undefined') return _localStore;
    if (!Memory.nameCatalog) Memory.nameCatalog = {};
    var root = Memory.nameCatalog;
    if (!root.assigned) root.assigned = { creep: {} }; // per type
    if (!root.byCreepName) root.byCreepName = {}; // creepName -> baseName
    return root;
}

function pickBase(role) {
    const root = ensureRoot();
    const list = Catalog[role] || [];
    for (const base of list) {
        if (!root.assigned.creep[base]) return base;
    }
    // Fallback: generate a synthetic base if catalog exhausted
    return (
        (role ? String(role).toUpperCase() : 'CREW') +
        '-' +
        (Game && Game.time ? Game.time % 100000 : Math.floor(Math.random() * 100000))
    );
}

function buildFullName(role, base) {
    // Include role and time to keep existing expectations
    var r = role || 'creep';
    var t = typeof Game !== 'undefined' && Game.time != null ? Game.time : Date.now();
    return r + '-' + base + '-' + t;
}

module.exports = {
    // Returns { name, base } without committing
    candidate(role) {
        const base = pickBase(role);
        return { name: buildFullName(role, base), base };
    },
    // After successful spawn, commit allocation for creep
    commitCreep(base, creepName, role) {
        const root = ensureRoot();
        root.assigned.creep[base] = { role: role, creepName: creepName };
        root.byCreepName[creepName] = base;
    },
    // Release by creepName (called on death cleanup)
    releaseForCreep(creepName) {
        const root = ensureRoot();
        const base = root.byCreepName[creepName];
        if (base) {
            delete root.byCreepName[creepName];
            delete root.assigned.creep[base];
        }
    },
    // Expose catalog (read-only usage suggested)
    list(role) {
        return (Catalog[role] || []).slice();
    },
};
