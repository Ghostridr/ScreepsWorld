# Newbie Land

[![License](https://img.shields.io/badge/license-GNU%20AGPL%20v3-blue.svg?style=plastic)](../LICENSE)

This folder is a deployment target for the community “Newbie Land” Screeps server. Scripts here are auto-synced from the canonical source in `src/` using symlink and copy tools. This ensures the code in `default/` always reflects the latest tested logic from development.

## Deployment & Sync Tools

Source files in `src/` are not manually copied here. Instead, use:

- **Symlink:**
  - `npm run link:screeps` — Instantly symlinks all modules from `src/` into `default/`, so changes in `src/` are reflected immediately.
- **Copy & Auto-update:**
  - `npm run screeps:copy` — Copies all modules from `src/` into `default/` and watches for changes, auto-updating files as you edit.
- **Clear:**
  - `npm run screeps:clear` — Removes all files from `default/` for a clean slate.

All server paths and deployment logic are managed in `tools/server_dirs.js`.

**How this affects this folder:**

- Do not edit files in `default/` directly; always edit in `src/` and use the tools above to sync.
- Any manual changes in `default/` will be overwritten the next time you run a sync tool.

## Why Newbie Land

- Public server welcoming new players (no token cost) with lenient rules and active help.
- Great for “live test” iterations once code works in Simulation/Training (`screeps.com/` directory in this repo).

## Directory layout

- `default/` – The code the Screeps client reads
  - `main.js` – Entry point; exports `module.exports.loop`.
  - `manager.spawner.js` – Simple spawn manager.
  - `role.harvester.js` | `role.upgrader.js` | `role.builder.js` – Role modules; each exports a `run(creep)` function.
- `README.md` – This file.
- `CHANGELOG.md` – Notes about local changes that affect the training setup.

Related repo folders:

- `src/` – The canonical source for all modules. Develop and test here; use the deployment tools to sync with `screeps_newbieland_net___21025/default/`.

## Using this with the rest of ScreepsWorld

- `src/` holds reusable logic and jest tests for testing that logic. Develop and test features here before syncing to Newbie Land or other servers.
- `screeps.com/` contains Simulation/Training scripts for offline testing. Use this for initial development and testing before moving features to Newbie Land.

## License

This folder inherits the repository’s license. See [LICENSE](../LICENSE) at the repo root.

---

[![Back to top](https://img.shields.io/badge/Back%20to%20top-222?style=plastic&logo=github)](#newbie-land)
