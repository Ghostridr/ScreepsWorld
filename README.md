# ScreepsWorld

[![License](https://img.shields.io/badge/license-GNU%20AGPL%20v3-blue.svg?style=plastic)](LICENSE)

[![Changelog Tracker](https://github.com/Ghostridr/ScreepsWorld/actions/workflows/changelog.yml/badge.svg)](https://github.com/Ghostridr/ScreepsWorld/actions/workflows/changelog.yml) [![Changelog Tracker (training)](https://github.com/Ghostridr/ScreepsWorld/actions/workflows/changelog_training.yml/badge.svg)](https://github.com/Ghostridr/ScreepsWorld/actions/workflows/changelog_training.yml) [![Changelog Tracker (newbieland)](https://github.com/Ghostridr/ScreepsWorld/actions/workflows/changelog_newbieland.yml/badge.svg)](https://github.com/Ghostridr/ScreepsWorld/actions/workflows/changelog_newbieland.yml)

*A learning-first JavaScript repo built by playing the MMO programming game **Screeps**.*

> **Goal:** Use Screeps as a practical lab to learn modern JavaScript by designing a clean, testable bot architecture. This repo favors understanding, debugging habits, and data-driven design over “shipping a clever bot.”

---

## Table of Contents

* [Vision & Principles](#vision--principles)
* [Learning Roadmap (Milestones)](#learning-roadmap-milestones)
* [Repository Structure](#repository-structure)
* [Deployment](#deployment)
* [Changelog](#changelog)
* [Resources](#resources)
* [Glossary](#glossary)
* [License](#license)

---

## Vision & Principles

**Learning-first:**

* Treat every feature as an exercise in JS fundamentals (modules, pure functions, interfaces), not raw bot power.
* Prefer tiny, testable steps over end-to-end dumps.

**Architecture:**

* Quarantine Screeps globals and I/O side-effects.
* Keep core logic as pure as possible; use adapters for the game runtime.

**Coach Mode (how this repo is used with ChatGPT):**

* **Hint ladder only:** Concepts → pseudocode (≤10 lines) → micro-snippets (≤5 lines).
* **No full solutions** unless explicitly requested with `give full code`.
* Be explicit about API uncertainty; verify with `console.log()` inspections.

**Success looks like:**

* Predictable logs each tick (time, CPU used) and stable Memory growth.
* A bot that’s easy to extend because the interfaces are clear and code is modular.

---

## Learning Roadmap (Milestones)

Each milestone validates for ~50–100 ticks unless noted. Boxes are targets for this repo.

* [ ] 🛠️ **M0 — Environment & Habits**
  * ⚙️ Build: `src/main.js` loop skeleton, `src/util.logger.js`, deploy flow.
  * ✅ Verify: end-of-tick log shows `Game.time` & `Game.cpu.getUsed()` trending predictably.

* [ ] 🧠 **M1 — Memory Hygiene & Schema**
  * 🧹 Build: `src/util.memory.js` (GC dead creeps/stale keys), `Memory.version` + migrations.
  * ✅ Verify: Memory growth stabilizes; logs show removed creep memory + migration applied.

* [ ] 🌾 **M2 — Harvester FSM**
  * 🤖 Build: `src/role.harvester.js` with `gather`/`deliver` states.
  * ✅ Verify: state logs; no flip-flop within 5 ticks at boundaries.

* [ ] 🧬 **M3 — SpawnManager v1**
  * 🏭 Build: `src/manager.spawner.js` ensures ≥1 harvester when energy ≥300.
  * ✅ Verify: auto-respawn after death; stable counts.

* [ ] 🏗️ **M4 — Upgrader & Builder**
  * 🔼 Build: `src/role.upgrader.js`, `src/role.builder.js`.
  * ✅ Verify: controller progress; builders idle only if no sites.

* [ ] 🗂️ **M5 — Role Router & Creep Registry**
  * 🛣️ Build: `src/driver.roles.js` dispatcher; `src/services.creeps.js` indexing by role.
  * ✅ Verify: per-role counts; no exceptions when a role is absent.

* [ ] 🗺️ **M6 — Pathing & Caching**
  * 🧭 Build: `src/services.pathing.js` (path cache, stuck detection).
  * ✅ Verify: CPU delta improves; cache hit rate >30% on busy ticks.

* [ ] 🏢 **M7 — Per-RCL Build Plan**
  * 📝 Build: `src/constants.plans.js` with planner emitting build intents per RCL.
  * ✅ Verify: on RCL change, intents valid; no illegal placements.

* [ ] 📋 **M8 — TaskManager v1 (Priority Queue)**
  * 🗃️ Build: `src/manager.task.js` central queue; simple priority + claim.
  * ✅ Verify: higher utilization; fewer idle ticks.

* [ ] 🗼 **M9 — Tower Logic & Defense**
  * 🛡️ Build: `src/manager.tower.js` heal → repair (cap) → attack priorities.
  * ✅ Verify: tower CPU under budget; repair caps respected.

* [ ] 🚀 **M10 — Remote Mining Starter**
  * 🏞️ Build: reserver + hauler basics; vision/route checks.
  * ✅ Verify: external room reserved; energy returns without timeouts.

* [ ] ✨ **M11 — Production Polish**
  * 🧩 Build: log levels; feature flags; error boundary wrapper; metrics dump.
  * ✅ Verify: toggleable logs; stable CPU trend.

> As a rule, every feature includes: (1) a tiny test, (2) a log message with structured fields, (3) a success metric to watch.

---

## Repository Structure

> **CommonJS** modules, organized to keep logic pure and side-effects isolated.

```text
src/
  main.js                   # exports.loop — top-level orchestration only
  configs.js                # configuration values
  constants.plans.js        # per-RCL build intents
  driver.game.js            # thin wrappers over Game/Memory (isolate globals)
  driver.movement.js        # moveTo policy, reusePath, caching adapters
  driver.roles.js           # role logic adapters
  index.constants.js        # constants index/exports
  manager.spawner.js        # auto-spawn creeps for all roles
  manager.task.js           # central queue, claims
  manager.tower.js          # heal/repair/attack priorities
  role.builder.js           # builder role logic
  role.harvester.js         # harvester role logic
  role.upgrader.js          # upgrader role logic
  services.creeps.js        # registry, indexing, counts
  services.pathing.js       # path cache/stuck detection APIs
  services.rooms.js         # per-room views, metrics
  util.logger.js            # log formatting, levels
  util.memory.js            # schema init, GC, migrations
  util.profiler.js          # optional CPU sampling helpers
  tests/                    # test files
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

> This repo assumes an **offline-first** workflow based in `src/`. Any modules within the root will appear in the Screeps client and be readable by the game. Screeps does not support folders or other files outside it's designed modules (`main`, `role.builder`, etc.).

**Release checklist:**

* [ ] All milestone checks pass locally for ≥50 ticks.
* [ ] Logs show stable CPU & memory.
* [ ] No unhandled exceptions for a full validation window.

---

## Changelog

A maintained log can be viewed at [CHANGELOG.md](CHANGELOG.md) for a detailed history of `.js` file changes within `src/`. For changes outside of this, please refer to the commit history.

I maintain a separate `CHANGELOG.md` for each server within **ScreepsWorld**. You can find them in the respective server directories. An index of all documentation can be found in the [Resources](#resources) section.

---

## Resources

1) 📚 **Screeps (Official)**
   * 🔗 [Discord](https://discord.gg/screeps)
   * 🔗 [Documentation](https://docs.screeps.com/)
   * 🔗 [Forum](https://screeps.com/forum/)
   * 🔗 [GitHub ⭐](https://github.com/screeps)
   * 🔗 [Site ⭐](https://screeps.com)
   * 🔗 [Steam](https://store.steampowered.com/app/464350/Screeps/)
   * 🔗 [Wiki ⭐](https://wiki.screepspl.us)
   * 🔗 [YouTube](https://www.youtube.com/@screeps3952)
2) 📚 **JavaScript**
   * 🔗 [JavaScript Info](https://javascript.info)
   * 🔗 [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
   * 🔗 [You Don't Know JS (book series)](https://github.com/getify/You-Dont-Know-JS)
   * 🔗 [Eloquent JavaScript (book)](https://eloquentjavascript.net/)
3) 📚 **Repository Doc Locations**
   * [docs/](docs/)
     * 📖 [Architecture](docs/architecture.md)
     * 📖 [Getting Started](docs/getting-started.md)
   * [root/](root/)
     * 📖 [README.md](README.md)
     * 📜 [CHANGELOG.md](CHANGELOG.md)
     * 📖 [CONTRIBUTING.md](CONTRIBUTING.md)
     * 📖 [LICENSE](LICENSE)
   * [Training Server](screeps.com)
     * 📜 [CHANGELOG.md](screeps.com/CHANGELOG.md)
     * 📖 [README.md](screeps.com/README.md)
   * [NewbieLand](screeps_newbieland_net___21025)
     * 📜 [CHANGELOG.md](screeps_newbieland_net___21025/CHANGELOG.md)
     * 📖 [README.md](screeps_newbieland_net___21025/README.md)

---

## Glossary

* **Pure function:** No side-effects; same input → same output.
* **FSM:** Finite state machine; used for roles like harvester.
* **RCL:** Room Controller Level.
* **TTL:** Time to live; used for cache expiry.

---

## License

This project is licensed under the `GNU General Public License v3.0`. See [LICENSE](LICENSE) for details. A quick summary of the license is as follows:

* You are free to use, modify, and distribute this project.
* Any derivative work must also be licensed under the same or a compatible license.
* There is no warranty for the software, and the authors are not liable for any damages.
* You must include a copy of the license in any distribution of the software.
* This license does not grant you any rights to use the trademarks or other intellectual property of the authors.

---

### Personal Notes & TODOs

* [x] Create `CHANGELOG.md` and a working, custom `changelog.yml`
* [x] Create `README.md` with project overview and setup instructions.
* [ ] Create `tests/` directory and add unit tests.
* [ ] Create other `changelog.yml` files for different servers with a `CHANGELOG.md`.
* [ ] Add badges (CI, lint, tests).
* [ ] Write `CONTRIBUTING.md` with hint ladder rules.
* [ ] Create `.editorconfig`, ESLint + Prettier configs.
