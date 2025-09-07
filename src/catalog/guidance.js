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
    EXT_SITE: {
        summary: 'Created extension site at {{x}},{{y}}',
        tips: [
            'Cluster extensions near spawn for shorter refill paths.',
            'Keep a one-tile walkway between rings.',
        ],
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

    // Healer
    HEALER_HEAL: {
        summary: 'Healer {{creep}} healing {{target}}',
        tips: [
            'Keep healers behind melee and near ranged units.',
            'Pair with guards or towers for safer rescues.',
        ],
    },
    HEALER_IDLE: {
        summary: 'No injured creeps in {{room}}',
        tips: ['Reduce healer count or reassign temporarily to other roles.'],
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
    RAMPART_SITE_RING: {
        summary: 'Created rampart site (ring) at {{x}},{{y}} r={{r}}',
        tips: [
            'Form protective rings; raise HP floors gradually.',
            'Prioritize chokepoints and high-value structures.',
        ],
    },
    RAMPART_SITE: {
        summary: 'Created rampart site at {{x}},{{y}}',
        tips: [
            'Stagger ramparts to form chokepoints; raise HP floors gradually.',
            'Place near entrances and around critical structures.',
        ],
    },

    // Additional structure site events added by aggregation
    SPAWN_SITE: {
        summary: 'Created spawn site at {{x}},{{y}}',
        tips: [
            'Keep exit tiles clear for new creeps.',
            'Position centrally to minimize logistics path length.',
        ],
    },
    TOWER_SITE: {
        summary: 'Created tower site at {{x}},{{y}}',
        tips: [
            'Distribute towers for coverage; maintain energy floor (~300).',
            'Avoid clustering all towers on one edge.',
        ],
    },
    STORAGE_SITE: {
        summary: 'Created storage site at {{x}},{{y}}',
        tips: [
            'Centralize near hub roads and link network.',
            'Protect with ramparts; avoid edge placement.',
        ],
    },
    TERMINAL_SITE: {
        summary: 'Created terminal site at {{x}},{{y}}',
        tips: [
            'Place adjacent or near storage for fast transfers.',
            'Reserve some energy for market orders.',
        ],
    },
    LINK_SITE: {
        summary: 'Created link site at {{x}},{{y}}',
        tips: [
            'One hub link near storage, one per active source, one near controller.',
            'Avoid bounce: schedule sends from a single service.',
        ],
    },
    LAB_SITE: {
        summary: 'Created lab site at {{x}},{{y}}',
        tips: [
            'Cluster labs for adjacency; reserve two for boosting later.',
            'Plan reagent chain layout early.',
        ],
    },
    FACTORY_SITE: {
        summary: 'Created factory site at {{x}},{{y}}',
        tips: [
            'Position near storage & terminal for commodity flow.',
            'Use once surplus base economy is stable.',
        ],
    },
    OBSERVER_SITE: {
        summary: 'Created observer site at {{x}},{{y}}',
        tips: [
            'Place safely inside defenses.',
            'Use to scout remotes / highway rooms for planning.',
        ],
    },
    POWER_SPAWN_SITE: {
        summary: 'Created power spawn site at {{x}},{{y}}',
        tips: [
            'Integrate after steady RCL8 economy.',
            'Feed with power + energy; protect with ramparts.',
        ],
    },
    NUKER_SITE: {
        summary: 'Created nuker site at {{x}},{{y}}',
        tips: [
            'Secure with ramparts; long charge time requires protection.',
            'Supply ghodium and energy steadily.',
        ],
    },
    WALL_SITE: {
        summary: 'Created wall site at {{x}},{{y}}',
        tips: [
            'Use walls to funnel hostiles into tower kill zones.',
            'Avoid overbuilding early; focus on chokepoints first.',
        ],
    },
};
