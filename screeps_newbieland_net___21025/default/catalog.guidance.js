/* eslint-env screeps */
// guidance.catalog.js — Central catalog of guidance entries keyed by Ref code.
// Screeps runtime reads .js modules only; keep this data-only CommonJS file.

module.exports = {
    // Spawner
    ROLE_LOAD: {
        summary: 'Failed to load role module {{role}}',
        tips: [
            'Ensure the role file exists and is named correctly.',
            'Check filename case-sensitivity.',
            'Verify module.exports exposes run(creep).',
            'Update roleNames if you renamed the role.',
        ],
    },
    SPAWN_FAIL: {
        summary: 'Spawn failed for {{role}} ({{code}})',
        tips: [
            'Ensure spawn has energy and is not busy.',
            'Validate body parts vs room energy capacity.',
            'Check role code for early exceptions.',
        ],
    },

    // Extensions/containers
    EXT_PLAN: {
        summary:
            'Planning up to {{need}} extensions (built={{built}}, sites={{sites}}, allowed={{allowed}})',
        tips: [
            'Upgrade controller to raise allowed count.',
            'Ensure builders have energy.',
            'Keep walkable space around spawn.',
        ],
    },
    CONT_STATE: {
        summary: 'Source {{source}} container {{state}}',
        tips: [
            'If state is site: assign a builder to construct it.',
            'Ensure the tile is not blocked by walls/structures.',
        ],
    },
    CONT_SITE: {
        summary: 'Created container site at {{x}},{{y}} near {{source}}',
        tips: ['Assign a builder to construct it.', 'Lay roads for miner/hauler paths.'],
    },

    // Miner/Harvester/Builder/Upgrader
    MINER_WAIT: {
        summary: 'Miner {{creep}} waiting for container',
        tips: ['Place a container near source and build it.'],
    },
    MINER_BIND: {
        summary: 'Miner {{creep}} bound to {{source}} on {{container}}',
        tips: ['Add a hauler to move energy to sinks.'],
    },
    HARV_WITHDRAW: {
        summary: 'Harvester {{creep}} withdrawing from container',
        tips: ['Keep containers stocked (miner+hauler).', 'Add roads to reduce travel time.'],
    },
    HARV_HARVEST: {
        summary: 'Harvester {{creep}} harvesting directly',
        tips: ['Place containers by sources to enable withdrawals.', 'Use a static miner.'],
    },
    NO_SINKS: {
        summary: 'No eligible energy sinks in {{room}}',
        tips: [
            'Build/repair extensions, spawn, or tower.',
            'If all full, upgrade controller or build roads.',
        ],
    },
    BUILDER_BUILD: {
        summary: 'Builder {{creep}} constructing',
        tips: ['Prioritize roads/containers early.', 'Keep extensions near spawn.'],
    },
    NO_SITES: {
        summary: 'No construction sites in {{room}}',
        tips: [
            'Use planners (containers/extensions) or place sites manually.',
            'Switch some builders to upgrader if idle persists.',
        ],
    },
    BUILDER_HARVEST: {
        summary: 'Builder {{creep}} gathering energy',
        tips: ['Prefer withdrawing from containers.', 'Add a miner to stock containers.'],
    },
    UPGR_UPGRADE: {
        summary: 'Upgrader {{creep}} upgrading controller',
        tips: [
            'Keep steady energy flow via container/link near controller.',
            'Throttle upgrader count if tower/extensions starve.',
        ],
    },
    UPGR_HARVEST: {
        summary: 'Upgrader {{creep}} gathering energy',
        tips: ['Prefer withdrawing from containers.', 'Add roads between sources and controller.'],
    },

    // Main/towers
    TOWER_ID: {
        summary: 'No tower found for hardcoded ID',
        tips: [
            'Replace with your tower’s actual Game ID.',
            'Or auto-discover via FIND_MY_STRUCTURES + STRUCTURE_TOWER.',
        ],
    },
    TOWER_NONE: {
        summary: 'No towers found in room (auto-discovery)',
        tips: [
            'Build a tower when RCL allows; it is a key defense and repair structure.',
            'Keep at least 300 energy reserved in towers for defense.',
        ],
    },
    TOWER_COUNT: {
        summary: 'Towers online: {{count}}',
        tips: [
            'More towers increase defense and repair throughput.',
            'Ensure haulers keep towers above the defense floor.',
        ],
    },

    // Roads & walls
    ROAD_SITE: {
        summary: 'Created road site at {{x}},{{y}} ({{link}})',
        tips: [
            'Roads lower fatigue; keep them repaired to floor.',
            'Use direct lines between spawn, sources, and controller.',
        ],
    },
    RAMPART_SITE: {
        summary: 'Created rampart site at {{x}},{{y}}',
        tips: [
            'Stagger ramparts to form chokepoints; raise HP floors gradually.',
            'Place near entrances and around critical structures.',
        ],
    },
};
