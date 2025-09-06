# Screeps Simulation/Training

[![License](https://img.shields.io/badge/license-GNU%20AGPL%20v3-blue.svg?style=plastic)](../LICENSE)

`Training/Local sandbox`
This folder is a deployment target for the official Screeps MMO server (`screeps.com`). Scripts here are auto-synced from the canonical source in `src/` using symlink and copy tools. This ensures the code in `default/` always reflects the latest tested logic from development.

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

## Directory structure

- `default/` – The code the Screeps client reads
  - `main.js` – Entry point; exports `module.exports.loop`.
  - `manager.spawner.js` – Simple spawn manager.
  - `role.harvester.js` | `role.upgrader.js` | `role.builder.js` – Role modules; each exports a `run(creep)` function.
- `README.md` – This file.
- `CHANGELOG.md` – Notes about local changes that affect the training setup.

Related repo folders:

- `src/` – The canonical source for all modules. Develop and test here; use the deployment tools to sync with `screeps.com/default/`.

## Notes

- This codebase uses CommonJS (`module.exports` / `require`) as expected by the Screeps runtime.
- Roles are intentionally small and composable for easy testing and verification.
- All deployment and sync logic is automated; manual copying is discouraged.

## License

This folder inherits the repository’s license. See [LICENSE](../LICENSE) at the repo root.

---
[![Back to top](https://img.shields.io/badge/Back%20to%20top-222?style=plastic&logo=github)](#screeps-simulationtraining)
