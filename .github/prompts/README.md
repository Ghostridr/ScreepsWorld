# Screeps Teacher Mode — Prompt Index

This folder contains reusable prompts designed for Screeps: World in “Teacher Mode.” Each prompt:

- Teaches first, code second; uses the §1 reply template from `copilot-instructions.md`.
- Asks 1–3 guiding questions before suggesting any code.
- Offers only tiny illustrative slices (5–15 lines), not full modules.

## Table of Contents

- [How to use](#how-to-use)
- [Prompts](#prompts)
- [Prompt index](#prompt-index)
- [Reply template reminder (short)](#reply-template-reminder-short)

## How to use

- Open a prompt file below and paste it into Chat, or reference it by name when asking for help.
- Keep modules flat (CommonJS) and honor single-writer Memory keys as described in Teacher Mode.

## Prompts

- screeps-economy-tuner.prompt.md — Tune spawn uptime, throughput, miner/hauler sizing.
- screeps-role-coach.prompt.md — Focus on a single role’s responsibility, invariants, and metrics.
- screeps-pathfinding-lab.prompt.md — PathFinder reuse, CostMatrix hygiene, stuck detection.
- screeps-queue-architect.prompt.md — Claim/Release lifecycle, fairness (age vs distance), TTL.
- screeps-links-planner.prompt.md — Source→Hub→Controller links with zero-bounce schedule.
- screeps-defense-tactician.prompt.md — Tower priorities, energy floors, repair policies.
- screeps-metrics-dashboard.prompt.md — Lightweight Memory.stats + periodic console dashboard.
- screeps-remote-mining.prompt.md — Remote room plan: reserver, miner/hauler math, risk gates.
- screeps-terminal-market.prompt.md — Terminal batching, budget floors, profitable trades.
- screeps-cpu-auditor.prompt.md — Bucket gating, deferrable work, pathing amortization.
- screeps-testing-tutor.prompt.md — Tiny Jest unit slices for helpers/services.
- screeps-modularization-guide.prompt.md — Layering, barrels, single-writer Memory ownership.
- screeps-rcl-navigator.prompt.md — Next-RCL plan (structures, roles, logistics) with actions.
- screeps-incident-triage.prompt.md — Regression triage: invariants, feature flags, safe patch.
- screeps-layout-roads.prompt.md — Cached road plan, hub placement, link anchors.

## Prompt index

1. ⚙️ [screeps-cpu-auditor.prompt.md](./screeps-cpu-auditor.prompt.md) — Bucket gating, deferrable work, pathing amortization.
2. 🛡️ [screeps-defense-tactician.prompt.md](./screeps-defense-tactician.prompt.md) — Tower priorities, energy floors, repair policies.
3. 📈 [screeps-economy-tuner.prompt.md](./screeps-economy-tuner.prompt.md) — Tune spawn uptime, throughput, miner/hauler sizing.
4. 🚑 [screeps-incident-triage.prompt.md](./screeps-incident-triage.prompt.md) — Regression triage: invariants, feature flags, safe patch.
5. 🛣️ [screeps-layout-roads.prompt.md](./screeps-layout-roads.prompt.md) — Cached road plan, hub placement, link anchors.
6. 🔗 [screeps-links-planner.prompt.md](./screeps-links-planner.prompt.md) — Source→Hub→Controller links with zero-bounce schedule.
7. 📊 [screeps-metrics-dashboard.prompt.md](./screeps-metrics-dashboard.prompt.md) — Lightweight Memory.stats + periodic console dashboard.
8. 🧩 [screeps-modularization-guide.prompt.md](./screeps-modularization-guide.prompt.md) — Layering, barrels, single-writer Memory ownership.
9. 🧭 [screeps-pathfinding-lab.prompt.md](./screeps-pathfinding-lab.prompt.md) — PathFinder reuse, CostMatrix hygiene, stuck detection.
10. 📋 [screeps-queue-architect.prompt.md](./screeps-queue-architect.prompt.md) — Claim/Release lifecycle, fairness (age vs distance), TTL.
11. 🗺️ [screeps-rcl-navigator.prompt.md](./screeps-rcl-navigator.prompt.md) — Next-RCL plan (structures, roles, logistics) with actions.
12. ⛏️ [screeps-remote-mining.prompt.md](./screeps-remote-mining.prompt.md) — Remote room plan: reserver, miner/hauler math, risk gates.
13. 🧑‍🏫 [screeps-role-coach.prompt.md](./screeps-role-coach.prompt.md) — Role responsibility, invariants, and metrics.
14. 🧪 [screeps-testing-tutor.prompt.md](./screeps-testing-tutor.prompt.md) — Tiny Jest unit slices for helpers/services.
15. 🏦 [screeps-terminal-market.prompt.md](./screeps-terminal-market.prompt.md) — Terminal batching, budget floors, profitable trades.

## Reply template reminder (short)

- Context: Summarize the goal in 1–2 lines.
- Why: State the principle (economy/CPU/defense) and impact.
- Mental Model: Checklist or tiny diagram.
- Snippet: 5–15 line slice showing only the new idea.
- What to Expect: Tick-by-tick behavior and success signals.
- Trade-offs & Next Step: One upgrade path and one risk.
- Homework: One measurement or tiny follow-up.

---

[![Back to top](https://img.shields.io/badge/Back%20to%20top-222?style=plastic&logo=github)](#screeps-teacher-mode--prompt-index)
