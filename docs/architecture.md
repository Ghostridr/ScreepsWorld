# ScreepsWorld Architecture

## Overview

ScreepsWorld uses a flat CommonJS module structure for the Screeps MMO, with all source code in `src/` and deployment targets in server-specific `/default/` directories. The architecture enforces single-responsibility modules, predictable data flow, and automated deployment using symlink and copy tools.

You can visit [Getting Started](getting-started.md) for a step-by-step guide to setting up and using this architecture or read the [README.md](../README.md) for an overview of the repo.

[![Getting Started](https://img.shields.io/badge/Getting%20Started-ff9800?style=plastic&logo=readme)](docs/getting-started.md) [![README](https://img.shields.io/badge/README-388e3c?style=plastic&logo=readme)](../README.md)

## Module Structure

- **src/main.js**: Entry point, exports `module.exports.loop`. Orchestrates tick order and delegates to managers and services.
- **manager/*.js**: Room-level policy, spawning, defense, and planning. Owns planning Memory keys.
- **service/*.js**: Pathfinding, link control, metrics, queues, and other infrastructure. Owns execution Memory keys.
- **role/*.js**: Stateless kernels for each creep role (harvester, builder, upgrader, hauler, etc). Reads job queues, acts on assigned jobs.
- **util/*.js**: Pure helpers, no side effects. Used by all layers.
- **config/*.js**: Constants, thresholds, static data. No game access.
- **task/*.js**: Centralized task/queue management (claim/release protocol).
- **driver/*.js**: Role dispatcher and registry.
- **behavior/*.js**: Composable behavior slices for roles and managers.

## Data Flow & Memory Ownership

- **Single-writer rule**: Each Memory key is owned and written by one module only (e.g., managers own planning keys, services own execution keys).
- **IDs in Memory**: Only IDs are stored; live game objects are rehydrated each tick using `Game.getObjectById()`.
- **Flat namespace**: All modules live in `src/` and are referenced by dot-named files in `/default/` (e.g., `role.harvester.js`).

## Deployment & Sync

- **Symlink (`link.js`)**: Instantly links all `src/**/*.js` files into each server's `/default/` directory. Changes in `src/` are reflected immediately.
- **Copy & Watch (`copy.js`)**: Copies all `src/**/*.js` files into `/default/` and watches for changes, auto-updating files as you edit.
- **Clear (`clear.js`)**: Removes all files from `/default/` for a clean slate.
- **Config (`server_dirs.js`)**: Centralizes server paths and exports `ROOT` and `SRC` for all deployment scripts.
- **Preview mode**: All deployment commands support a `--preview` flag to list actions without making changes.
  - Example: `npm run screeps:link:preview` lists files that would be linked without modifying anything.

## Tick Pipeline

1. **Housekeeping**: Clean up dead creeps and stale Memory keys.
2. **Heavy planners**: Run expensive planners (pathfinding, layout) if CPU bucket allows.
3. **Per-room managers**: Handle spawning, defense, and planning for each room.
4. **Service passes**: Execute link transfers, tower actions, metrics collection.
5. **Role execution**: Each creep runs its assigned role kernel.

## Key Invariants

- No cross-layer imports (roles may use services/util, but not managers).
- Only one module writes each Memory key; others read as needed.
- No live objects in Memory; only IDs.
- CPU-heavy tasks are bucket-gated.
- Flat directory, CommonJS modules, dot-named files in `/default/`.

## Example Data Flow

```sh
main.js
  ├─ manager.spawner.js
  ├─ manager.tower.js
  ├─ service.pathing.js
  ├─ service.links.js
  ├─ role.harvester.js
  ├─ role.hauler.js
  └─ util.logger.js
```

## Extending & Contributing

- Add new modules to `src/` with a single, clear responsibility.
- Update [server_dirs.js](../tools/server_dirs.js) to add/remove server targets.
- Use deployment tools to keep all servers in sync.
- Follow the single-writer Memory rule and use IDs for all game objects.

---

For more details, see the root `README.md` and module contracts in `src/`.

[![Back to top](https://img.shields.io/badge/Back%20to%20top-222?style=plastic&logo=github)](#screepsworld-architecture)
