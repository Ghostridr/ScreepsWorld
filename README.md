![ScreepsWorld Banner](assets/img/screeps_banner.png)

# ScreepsWorld

[![License](https://img.shields.io/badge/license-GNU%20AGPL%20v3-blue.svg?style=plastic)](LICENSE)

[![CI](https://github.com/Ghostridr/ScreepsWorld/actions/workflows/ci.yml/badge.svg)](https://github.com/Ghostridr/ScreepsWorld/actions/workflows/ci.yml) [![PR Labeler](https://github.com/Ghostridr/ScreepsWorld/actions/workflows/labeler.yml/badge.svg)](https://github.com/Ghostridr/ScreepsWorld/actions/workflows/labeler.yml) [![Changelog](https://github.com/Ghostridr/ScreepsWorld/actions/workflows/changelog.yml/badge.svg)](https://github.com/Ghostridr/ScreepsWorld/actions/workflows/changelog.yml)

## Getting Started

If you're new to ScreepsWorld or the Screeps game, it's strongly recommended to begin with the [Getting Started guide](docs/getting-started.md). This document covers setup, project structure, and key workflows to help you onboard quickly and confidently.

[![Getting Started](https://img.shields.io/badge/Getting%20Started-ff9800?style=plastic&logo=readme)](docs/getting-started.md)

`Offline Development` _A learning-first JavaScript repo built by playing the MMO programming game **Screeps**._

> **Goal:** Use Screeps as a practical lab to learn modern JavaScript by designing a clean, testable bot architecture. This repo favors understanding, debugging habits, and data-driven design over “shipping a clever bot.”

---

## Table of Contents

- [Vision & Principles](#vision--principles)
- [Learning Roadmap (Milestones)](#learning-roadmap-milestones)
- [Repository Structure](#repository-structure)
- [Deployment](#deployment)
- [Changelog](#changelog)
- [Resources](#resources)
- [Glossary](#glossary)
- [Contributing](#contributing)
- [License](#license)

---

## Vision & Principles

**Learning-first:**

- Treat every feature as an exercise in JS fundamentals (modules, pure functions, interfaces), not raw bot power.
- Prefer tiny, testable steps over end-to-end dumps.

**Architecture:**

- Quarantine Screeps globals and I/O side-effects.
- Keep core logic as pure as possible; use adapters for the game runtime.

**Coach Mode (how this repo is used with ChatGPT):**

- **Hint ladder only:** Concepts → pseudocode (≤10 lines) → micro-snippets (≤5 lines).
- **No full solutions** unless explicitly requested with `give full code`.
- Be explicit about API uncertainty; verify with `console.log()` inspections.

**Success looks like:**

- Predictable logs each tick (time, CPU used) and stable Memory growth.
- A bot that’s easy to extend because the interfaces are clear and code is modular.

---

## Learning Roadmap (Milestones)

Each milestone validates for ~50–100 ticks unless noted. Boxes are targets for this repo.

- [ ] 🛠️ **M0 — Environment & Habits**
  - ⚙️ Build: `src/main.js` loop skeleton, `src/util.logger.js`, deploy flow.
  - ✅ Verify: end-of-tick log shows `Game.time` & `Game.cpu.getUsed()` trending predictably.

- [ ] 🧠 **M1 — Memory Hygiene & Schema**
  - 🧹 Build: `src/util.memory.js` (GC dead creeps/stale keys), `Memory.version` + migrations.
  - ✅ Verify: Memory growth stabilizes; logs show removed creep memory + migration applied.

- [ ] 🌾 **M2 — Harvester FSM**
  - 🤖 Build: `src/role.harvester.js` with `gather`/`deliver` states.
  - ✅ Verify: state logs; no flip-flop within 5 ticks at boundaries.

- [ ] 🧬 **M3 — SpawnManager v1**
  - 🏭 Build: `src/manager.spawner.js` ensures ≥1 harvester when energy ≥300.
  - ✅ Verify: auto-respawn after death; stable counts.

- [ ] 🏗️ **M4 — Upgrader & Builder**
  - 🔼 Build: `src/role.upgrader.js`, `src/role.builder.js`.
  - ✅ Verify: controller progress; builders idle only if no sites.

- [ ] 🗂️ **M5 — Role Router & Creep Registry**
  - 🛣️ Build: `src/driver.roles.js` dispatcher; `src/services.creeps.js` indexing by role.
  - ✅ Verify: per-role counts; no exceptions when a role is absent.

- [ ] 🗺️ **M6 — Pathing & Caching**
  - 🧭 Build: `src/services.pathing.js` (path cache, stuck detection).
  - ✅ Verify: CPU delta improves; cache hit rate >30% on busy ticks.

- [ ] 🏢 **M7 — Per-RCL Build Plan**
  - 📝 Build: `src/constants.plans.js` with planner emitting build intents per RCL.
  - ✅ Verify: on RCL change, intents valid; no illegal placements.

- [ ] 📋 **M8 — TaskManager v1 (Priority Queue)**
  - 🗃️ Build: `src/manager.task.js` central queue; simple priority + claim.
  - ✅ Verify: higher utilization; fewer idle ticks.

- [ ] 🗼 **M9 — Tower Logic & Defense**
  - 🛡️ Build: `src/manager.tower.js` heal → repair (cap) → attack priorities.
  - ✅ Verify: tower CPU under budget; repair caps respected.

- [ ] 🚀 **M10 — Remote Mining Starter**
  - 🏞️ Build: reserver + hauler basics; vision/route checks.
  - ✅ Verify: external room reserved; energy returns without timeouts.

- [ ] ✨ **M11 — Production Polish**
  - 🧩 Build: log levels; feature flags; error boundary wrapper; metrics dump.
  - ✅ Verify: toggleable logs; stable CPU trend.

> As a rule, every feature includes: (1) a tiny test, (2) a log message with structured fields, (3) a success metric to watch.

---

## Repository Structure

> This repo uses symlinks to avoid duplication and keep the source organized in `src/`. See [Deployment](#deployment) for details.

The core bot code lives in `src/` with a modular structure inspired by common design patterns. Each file is documented with its purpose.

```sh
src/
  main.js             # Loop entry point
  catalog/            # Static data & enums
    guidance.js       # Guidance messages
    names.js          # Creep names
  config/
    colors.js         # Color constants
    constants.js      # Game constants
    debug.js          # Debugging flags
    paths.js          # Pathfinding constants
    scaler.js         # Scaling utilities
  helper/
    guidance.js       # Guidance helpers
  manager/
    container.js      # Container management
    extension.js      # Extension management
    road.js           # Road management
    spawner.js        # Spawner management
    tower.js          # Tower management
    wall.js           # Wall management
  role/
    builder.js        # Builder role
    harvester.js      # Harvester role
    hauler.js         # Hauler role
    healer.js         # Healer role
    miner.js          # Miner role
    repairer.js       # Repairer role
    upgrader.js       # Upgrader role
  service/
    auto.detect.js    # Auto-detect service
    creeps.js         # Creep registry service
    flags.js          # Flag management service
    market.js         # Market service
    metrics.js        # Metrics collection service
    power.js          # Power management service
    rooms.js          # Room management service
    spawns.js         # Spawn registry service
    structures.js     # Structure registry service
    towers.js         # Tower registry service
  driver/
    roles.js          # Role dispatcher
  task/
    task.js           # Task manager (priority queue)
  behavior/
    build.js          # Build behavior
    construction.js   # Construction behavior
    haul.js           # Haul behavior
    heal.js           # Heal behavior
    pathing.js        # Pathing behavior
    repair.js         # Repair behavior
    say.js            # Say behavior
    sources.js        # Sources behavior
  tools/
    clear.js          # Clear symlinks (ignored)
    link.js           # Create symlinks (ignored)
  util/
    caching.js        # Caching utilities
    memory.js         # Memory utilities
    heartbeat.js      # Heartbeat utilities
    logger.js         # Logging utilities
    mapper.js         # Mapping utilities
```

**Minimal loop skeleton (illustrative):**

```js
// src/main.js
'use strict';
exports.loop = function () {
  // orchestrate managers and log tick/CPU here
};
```

---

## Deployment

> This repo assumes an **offline-first** workflow based in `src/`.

Any modules within the root will appear in the Screeps client and be readable by the game. Screeps does not support folders or other files outside it's designed modules (`main`, `role.builder`, etc.) using a flat directory structure. However, this repo uses symlinks to avoid duplication and keep the source organized in `src/`.

**Deployment tools:**

- `tools/server_dirs.js`: Centralizes the list of server directories and exports `ROOT` and `SRC` paths for all deployment scripts.
- `tools/link.js`: Symlinks every `src/**/*.js` (excluding tools) into each server's `/default` directory using dot-named module filenames. Updates are instant via symlinks.
- `tools/copy.js`: Copies every `src/**/*.js` (excluding tools) into each server's `/default` directory, overwriting files and auto-updating on source changes (uses a file watcher for live sync).
- `tools/clear.js`: Deletes all files in the `/default` subdirectory of each server listed in `server_dirs.js`.

**Usage:**

- To update symlinks, run:

  ```sh
  npm run screeps:link
  ```

- To copy files and auto-update on changes, run:

  ```sh
  npm run screeps:copy
  ```

- To clear all files in `/default` directories, run:

  ```sh
  npm run screeps:clear
  ```

- To preview actions (no changes made), use:

  ```sh
  npm run screeps:link:preview
  npm run screeps:copy:preview
  npm run screeps:clear:preview
  ```

All server paths and root/src locations are managed in `tools/server_dirs.js`.

To clear all symlinks, run:

```sh
node src/tools/clear.js
```

> **CommonJS** modules, organized to keep logic pure and side-effects isolated.

**Release checklist:**

- [ ] All milestone checks pass locally for ≥50 ticks.
- [ ] Logs show stable CPU & memory.
- [ ] No unhandled exceptions for a full validation window.

---

## Changelog

A maintained log can be viewed at [CHANGELOG.md](CHANGELOG.md) for a detailed history of `.js` file changes within `src/`. For changes outside of this, please refer to the commit history.

I maintain a separate `CHANGELOG.md` for each server within **ScreepsWorld**. You can find them in the respective server directories. An index of all documentation can be found in the [Resources](#resources) section.

---

## Resources

1. 📚 **Screeps (Official)**
   - 🔗 [Discord](https://discord.gg/screeps)
   - 🔗 [Documentation](https://docs.screeps.com/)
   - 🔗 [Forum](https://screeps.com/forum/)
   - 🔗 [GitHub ⭐](https://github.com/screeps)
   - 🔗 [Site ⭐](https://screeps.com)
   - 🔗 [Steam](https://store.steampowered.com/app/464350/Screeps/)
   - 🔗 [Wiki ⭐](https://wiki.screepspl.us)
   - 🔗 [YouTube](https://www.youtube.com/@screeps3952)
2. 📚 **JavaScript**
   - 🔗 [JavaScript Info](https://javascript.info)
   - 🔗 [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
   - 🔗 [You Don't Know JS (book series)](https://github.com/getify/You-Dont-Know-JS)
   - 🔗 [Eloquent JavaScript (book)](https://eloquentjavascript.net/)
3. 📚 **Repository Doc Locations**
   - 📁 [.github/](.github/)
     - 🤖 [Copilot Instructions](.github/copilot-instructions.md)
     - 📁 [instructions/](.github/instructions/)
       - 🤖 [screeps-teacher.instructions.md](.github/instructions/screeps-teacher.instructions.md)
     - 📁 [prompts/](.github/prompts/)
       - 📖 [README.md](.github/prompts/README.md)
       - 🧑‍🏫 [Screeps CPU Auditor](.github/prompts/screeps-cpu-auditor.prompt.md)
       - 🧑‍🏫 [Screeps Defense Tactician](.github/prompts/screeps-defense-tactician.prompt.md)
       - 🧑‍🏫 [Screeps Economy Tuner](.github/prompts/screeps-economy-tuner.prompt.md)
       - 🧑‍🏫 [Screeps Incident Triage](.github/prompts/screeps-incident-triage.prompt.md)
       - 🧑‍🏫 [Screeps Layout & Roads Coach](.github/prompts/screeps-layout-roads.prompt.md)
       - 🧑‍🏫 [Screeps Lesson](.github/prompts/screeps-lesson.prompt.md)
       - 🧑‍🏫 [Screeps Links Planner](.github/prompts/screeps-links-planner.prompt.md)
       - 🧑‍🏫 [Screeps Metrics Dashboard](.github/prompts/screeps-metrics-dashboard.prompt.md)
       - 🧑‍🏫 [Screeps Modularization Guide](.github/prompts/screeps-modularization-guide.prompt.md)
       - 🧑‍🏫 [Screeps Pathfinding Lab](.github/prompts/screeps-pathfinding-lab.prompt.md)
       - 🧑‍🏫 [Screeps Queue Architect](.github/prompts/screeps-queue-architect.prompt.md)
       - 🧑‍🏫 [Screeps RCL Milestone Navigator](.github/prompts/screeps-rcl-navigator.prompt.md)
       - 🧑‍🏫 [Screeps Remote Mining](.github/prompts/screeps-remote-mining.prompt.md)
       - 🧑‍🏫 [Screeps Role Coach](.github/prompts/screeps-role-coach.prompt.md)
       - 🧑‍🏫 [Screeps Terminal Market](.github/prompts/screeps-terminal-market.prompt.md)
       - 🧑‍🏫 [Screeps Testing Tutor](.github/prompts/screeps-testing-tutor.prompt.md)
   - 📁 [configs/](configs/)
     - 📖 [README.md](configs/README.md)
   - 📁 [docs/](docs/)
     - 📖 [Architecture](docs/architecture.md)
     - 📖 [Getting Started](docs/getting-started.md)
     - 📁 [templates/](docs/templates/)
       - 🧩 [Copilot Instruction Template](docs/templates/copilot-instructions.template.md)
   - 📁 [tools/](tools/)
     - 📖 [README.md](tools/README.md)
   - 📁 [root/](root/)
     - 📖 [README.md](README.md)
     - 📜 [CHANGELOG.md](CHANGELOG.md)
     - 📖 [CONTRIBUTING.md](CONTRIBUTING.md)
     - 📖 [LICENSE](LICENSE)
   - 📁 [NewbieLand](screeps_newbieland_net___21025)
     - 📜 [CHANGELOG.md](screeps_newbieland_net___21025/CHANGELOG.md)
     - 📖 [README.md](screeps_newbieland_net___21025/README.md)
   - 📁 [Training Server](screeps.com)
     - 📜 [CHANGELOG.md](screeps.com/CHANGELOG.md)
     - 📖 [README.md](screeps.com/README.md)

---

## Glossary

- **Pure function:** No side-effects; same input → same output.
- **FSM:** Finite state machine; used for roles like harvester.
- **RCL:** Room Controller Level.
- **TTL:** Time to live; used for cache expiry.

---

## Contributing

- Pre-commit checks run automatically (Husky + lint-staged):
  - strictify equality (==/!= ➜ ===/!==, preserving `== null` when intended)
  - ESLint auto-fix with the config in `config/eslint.config.mjs`
- CI runs on pushes/PRs and will skip when a PR only changes the training folder (`screeps.com/**`). Such PRs get a `training-only` label.
- Manual runs:
  - Fix repo: `npm run fix` (runs strictify, then eslint --fix)
  - Lint only: `npm run lint`
  - Strictify interactive: `npm run strictify:eq`
    - Non-interactive exclude training: `npm run strictify:eq -- --no-prompt`
    - Include training: `npm run strictify:eq -- --include-training --no-prompt`

If a role fails to load, the spawner logs a descriptive error with tips (check filename, exports, and `roleNames`).

For more information on contributing, please refer to the [CONTRIBUTING.md](CONTRIBUTING.md) file.

---

## License

This project is licensed under the `GNU General Public License v3.0`. See [LICENSE](LICENSE) for details. A quick summary of the license is as follows:

- You are free to use, modify, and distribute this project.
- Any derivative work must also be licensed under the same or a compatible license.
- There is no warranty for the software, and the authors are not liable for any damages.
- You must include a copy of the license in any distribution of the software.
- This license does not grant you any rights to use the trademarks or other intellectual property of the authors.

---

### Personal Notes & TODOs

- [x] Create `CHANGELOG.md` and a working, custom `changelog.yml`
- [x] Create `README.md` with project overview and setup instructions.
- [ ] Create `tests/` directory and add unit tests.
- [ ] Create other `changelog.yml` files for different servers with a `CHANGELOG.md`.
- [ ] Add badges (CI, lint, tests).
- [ ] Write `CONTRIBUTING.md` with hint ladder rules.
- [ ] Create `.editorconfig`, ESLint + Prettier configs.

---

[![Back to top](https://img.shields.io/badge/Back%20to%20top-222?style=plastic&logo=github)](#screepsworld)
