# Newbie Land (screeps_newbieland_net___21025)

A live testing workspace wired to the community “Newbie Land” Screeps server. I use this folder to push code straight into a running room and verify behavior under real ticks, spawns, and hostiles.

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

- `src/` – A minimal, Node-friendly mirror of the same logic used for unit tests (`npm test`). I develop in `src/` and copy into `screeps.com/default/` when I’m ready to try it in the simulator.

## Using this with the rest of ScreepsWorld

- `src/` holds reusable logic and jest tests for testing that logic. I'll move features from there into this Newbie Land folder when ready for live ticks after testing.
- `screeps.com/` contains Simulation/Training scripts for offline testing. This is where I develop and test new features before moving them to Newbie Land or other servers.

## License

This folder inherits the repository’s license. See [LICENSE](../LICENSE) at the repo root.
