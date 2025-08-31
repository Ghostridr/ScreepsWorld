# ScreepsWorld

[![Changelog Tracker](https://github.com/Ghostridr/ScreepsWorld/actions/workflows/changelog.yml/badge.svg?branch=master&event=check_run)](https://github.com/Ghostridr/ScreepsWorld/actions/workflows/changelog.yml)

*A learning-first JavaScript repo built by playing the MMO programming game **Screeps**.*

> **Goal:** Use Screeps as a practical lab to learn modern JavaScript by designing a clean, testable bot architecture. This repo favors understanding, debugging habits, and data-driven design over “shipping a clever bot.”

---

## Table of Contents

* [Vision & Principles](#vision--principles)
* [Learning Roadmap (Milestones)](#learning-roadmap-milestones)
* [Repository Structure](#repository-structure)
* [Deployment](#deployment)
* [Glossary](#glossary)
* [Changelog](#changelog)
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

Each milestone validates for \~50–100 ticks unless noted. Boxes are targets for this repo.

* [ ] **M0 — Environment & Habits**

  * Build: `src/main.js` loop skeleton, `utils/logger.js`, deploy flow.
  * Verify: end-of-tick log shows `Game.time` & `Game.cpu.getUsed()` trending predictably.
* [ ] **M1 — Memory Hygiene & Schema**

  * Build: `utils/memory.js` (GC dead creeps/stale keys), `Memory.version` + migrations.
  * Verify: Memory growth stabilizes; logs show removed creep memory + migration applied.
* [ ] **M2 — Harvester FSM**

  * Build: `roles/harvester.js` with `gather`/`deliver` states.
  * Verify: state logs; no flip‑flop within 5 ticks at boundaries.
* [ ] **M3 — SpawnManager v1**

  * Build: `managers/spawn.js` ensures ≥1 harvester when energy ≥300.
  * Verify: auto-respawn after death; stable counts.
* [ ] **M4 — Upgrader & Builder**

  * Build: `roles/upgrader.js`, `roles/builder.js`.
  * Verify: controller progress; builders idle only if no sites.
* [ ] **M5 — Role Router & Creep Registry**

  * Build: `runRole(creep)` dispatcher; `services/creeps.js` indexing by role.
  * Verify: per-role counts; no exceptions when a role is absent.
* [ ] **M6 — Pathing & Caching**

  * Build: path cache (pos→pos key, TTL), stuck detection.
  * Verify: CPU delta improves; cache hit rate >30% on busy ticks.
* [ ] **M7 — Per‑RCL Build Plan**

  * Build: `constants/plans.js` with planner emitting build intents per RCL.
  * Verify: on RCL change, intents valid; no illegal placements.
* [ ] **M8 — TaskManager v1 (Priority Queue)**

  * Build: central queue; simple priority + claim.
  * Verify: higher utilization; fewer idle ticks.
* [ ] **M9 — Tower Logic & Defense**

  * Build: heal → repair (cap) → attack priorities.
  * Verify: tower CPU under budget; repair caps respected.
* [ ] **M10 — Remote Mining Starter**

  * Build: reserver + hauler basics; vision/route checks.
  * Verify: external room reserved; energy returns without timeouts.
* [ ] **M11 — Production Polish**

  * Build: log levels; feature flags; error boundary wrapper; metrics dump.
  * Verify: toggleable logs; stable CPU trend.

> As a rule, every feature includes: (1) a tiny test, (2) a log message with structured fields, (3) a success metric to watch.

---

## Repository Structure

> **CommonJS** modules, organized to keep logic pure and side-effects isolated.

```text
src/
  main.js                 # exports.loop — top-level orchestration only
  constants/
    roles.js              # role names, body configs, caps
    plans.js              # per-RCL build intents
  utils/
    logger.js             # log formatting, levels
    memory.js             # schema init, GC, migrations
    profiler.js           # optional CPU sampling helpers
  drivers/
    game.js               # thin wrappers over Game/Memory (isolate globals)
    movement.js           # moveTo policy, reusePath, caching adapters
  services/
    creeps.js             # registry, indexing, counts
    rooms.js              # per-room views, metrics
    pathing.js            # path cache/stuck detection APIs
  roles/
    harvester.js
    upgrader.js
    builder.js
  managers/
    spawn.js              # planSpawns(room) -> orders[]
    task.js               # central queue, claims
    tower.js              # heal/repair/attack priorities
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

## Glossary

* **Pure function:** No side-effects; same input → same output.
* **FSM:** Finite state machine; used for roles like harvester.
* **RCL:** Room Controller Level.
* **TTL:** Time to live; used for cache expiry.

---

## Changelog

Maintain `CHANGELOG.md` (Keep a Changelog format). Tag milestones when their verification criteria pass.

---

## License

See [LICENSE](LICENSE) for details.

---

### Personal Notes & TODOs

* [ ] Add badges (CI, lint, tests).
* [ ] Write `CONTRIBUTING.md` with hint ladder rules.
* [ ] Create `.editorconfig`, ESLint + Prettier configs.
