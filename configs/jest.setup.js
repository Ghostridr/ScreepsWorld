
/**
 * Jest Global Setup for ScreepsWorld
 *
 * Purpose: Configure global test environment, mocks, matchers, and cleanup for all tests.
 * This file runs before every test suite. Add only global hooks and helpers here.
 *
 * Sections:
 *   1. Global Mocks
 *   2. Custom Matchers
 *   3. Environment Tweaks
 *   4. Cleanup Hooks
 *   5. Screeps Stubs (Memory, Game)
 *   6. Role/Manager/Service Singletons
 *   7. Screeps Constants
 */

// ─── 1. Global Mocks ──────────────────────────────────────────
// Example: Mock global objects/functions for consistent test runs.
// global.Date = ...;

// ─── 2. Custom Matchers ──────────────────────────────────────
// Example: Extend Jest with custom matchers if needed.
// expect.extend({ ... });

// ─── 3. Environment Tweaks ───────────────────────────────────
// Example: Set up environment variables, polyfills, or other global state.
// process.env.NODE_ENV = 'test';

// ─── 4. Cleanup Hooks ────────────────────────────────────────
// Example: Add afterEach/afterAll hooks for resource cleanup.
// afterEach(() => { /* cleanup logic */ });

// ─── 5. Screeps Stubs (Memory, Game) ─────────────────────────
// Provide all required game constants, role/service singletons, and utility globals
// for integration and orchestration tests. Ensures modules and test spies
// can run without ReferenceErrors, simulating the Screeps runtime.

// --- Memory stub (for compatibility) ---
global.Memory = global.Memory || {};
global.Memory.rooms = global.Memory.rooms || {};
global.Memory.pathCache = global.Memory.pathCache || {};
global.Memory.creeps = global.Memory.creeps || {};
global.Memory.construction = global.Memory.construction || {};
global.Memory.haulers = global.Memory.haulers || {};
global.Memory.names = global.Memory.names || {};
global.Memory.stats = global.Memory.stats || {};
global.Memory.log = global.Memory.log || {};

// --- Game stub (for compatibility) ---
global.Game = global.Game || {};
global.Game.time = global.Game.time || 1;
global.Game.cpu = global.Game.cpu || { bucket: 10000 };
global.Game.rooms = global.Game.rooms || {};
global.Game.spawns = global.Game.spawns || {};
global.Game.creeps = global.Game.creeps || {};
global.Game.structures = global.Game.structures || {};
global.Game.flags = global.Game.flags || {};

// ─── 6. Role/Manager/Service Singletons ──────────────────────
// Each singleton is represented as a global object with jest.fn() methods to allow spying.
// Extend this section as new roles, managers, services, or utilities are added to the codebase.

// --- Manager Singletons ---
global.mgrSpawn = { loop: jest.fn() };
global.mgrCont = { loop: jest.fn() };
global.mgrExt = { loop: jest.fn() };
global.mgrTower = { loop: jest.fn() };
global.mgrRoad = { loop: jest.fn() };
global.mgrWall = { loop: jest.fn() };

// --- Role Singletons ---
global.Harvester = { run: jest.fn() };
global.Upgrader = { run: jest.fn() };
global.Builder = { run: jest.fn() };
global.Miner = { run: jest.fn() };
global.Hauler = { run: jest.fn() };
global.Healer = { run: jest.fn() };
global.Repairer = { run: jest.fn() };

// --- Service/Utility Singletons ---
global.Threat = {
	scan: jest.fn(),
	enforce: jest.fn(),
	isDanger: jest.fn(() => false)
};
global.HaulQ = {
	enqueueRefill: jest.fn(),
	claim: jest.fn(),
	get: jest.fn(),
	release: jest.fn()
};
global.SrcSvc = {
	plan: jest.fn(),
	releaseMinerSeat: jest.fn(),
	claimBare: jest.fn(),
	findAndClaimNearestFreeSeatSafe: jest.fn(),
	claimSpecificSeat: jest.fn()
};
global.BuildSvc = { sweep: jest.fn() };
global.Cache = {
	sweep: jest.fn(),
	get: jest.fn(),
	set: jest.fn(),
	del: jest.fn(),
	has: jest.fn()
};
global.Heartbeat = { run: jest.fn() };
global.Log = {
	info: jest.fn(),
	once: jest.fn(),
	construction: {
		autoScan: jest.fn(),
		flush: jest.fn()
	}
};
global.Config = { init: jest.fn() };
global.DebugCfg = { init: jest.fn() };
global.Names = {
	generateCreepName: jest.fn(),
	releaseForCreep: jest.fn()
};

// ─── 7. Screeps Constants ─────────────────────────────────────
// Structure constants for test environment
global.FIND_MY_SPAWNS = 1;
global.RoomPosition = function(x, y, roomName) { return { x, y, roomName }; };

global.STRUCTURE_CONTAINER = 'container';
global.STRUCTURE_CONTROLLER = 'controller';
global.STRUCTURE_EXTENSION = 'extension';
global.STRUCTURE_EXTRACTOR = 'extractor';
global.STRUCTURE_FACTORY = 'factory';
global.STRUCTURE_KEEPER_LAIR = 'keeperLair';
global.STRUCTURE_LAB = 'lab';
global.STRUCTURE_LINK = 'link';
global.STRUCTURE_NUKER = 'nuker';
global.STRUCTURE_OBSERVER = 'observer';
global.STRUCTURE_PORTAL = 'portal';
global.STRUCTURE_POWER_BANK = 'powerBank';
global.STRUCTURE_POWER_SPAWN = 'powerSpawn';
global.STRUCTURE_RAMPART = 'rampart';
global.STRUCTURE_ROAD = 'road';
global.STRUCTURE_SPAWN = 'spawn';
global.STRUCTURE_STORAGE = 'storage';
global.STRUCTURE_TERMINAL = 'terminal';
global.STRUCTURE_TOWER = 'tower';
global.STRUCTURE_WALL = 'wall';
