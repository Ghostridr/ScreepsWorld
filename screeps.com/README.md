# screeps

[![License](https://img.shields.io/badge/license-GNU%20AGPL%20v3-blue.svg?style=plastic)](../LICENSE)

[![Changelog Tracker (training)](https://github.com/Ghostridr/ScreepsWorld/actions/workflows/changelog_training.yml/badge.svg)](https://github.com/Ghostridr/ScreepsWorld/actions/workflows/changelog_training.yml)

`Training/Local sandbox`
This folder is my local sandbox for the official Screeps MMO server (screeps.com). I use it to iterate on scripts safely in the Simulation » Training mode before uploading to the live world.

## Directory structure

- `default/` – The code the Screeps client reads
  - `main.js` – Entry point; exports `module.exports.loop`.
  - `manager.spawner.js` – Simple spawn manager.
  - `role.harvester.js` | `role.upgrader.js` | `role.builder.js` – Role modules; each exports a `run(creep)` function.
- `README.md` – This file.
- `CHANGELOG.md` – Notes about local changes that affect the training setup.

Related repo folders:

- `src/` – A minimal, Node-friendly mirror of the same logic used for unit tests (`npm test`). I develop in `src/` and copy into `screeps.com/default/` when I’m ready to try it in the simulator.

## Notes

- This codebase uses CommonJS (`module.exports` / `require`) as expected by the Screeps runtime.
- Roles are intentionally small and composable so they’re easy to test in isolation and then verify in Training.

## License

This folder inherits the repository’s license. See [LICENSE](../LICENSE) at the repo root.

---
[![Back to top](https://img.shields.io/badge/Back%20to%20top-222?style=plastic&logo=github)](#screeps)
