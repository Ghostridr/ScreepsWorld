# Getting Started with ScreepsWorld

Welcome to ScreepsWorld — a modular JavaScript bot architecture for the Screeps MMO. This guide will help you set up your environment, understand the project structure, and deploy code to your Screeps servers with confidence.

Visit the [README](../README.md) for an overview of the repo or read [Architecture](architecture.md) for design principles and module structure.

[![README](https://img.shields.io/badge/README-388e3c?style=plastic&logo=readme)](../README.md) [![Architecture](https://img.shields.io/badge/Architecture-ff9800?style=plastic&logo=readme)](docs/architecture.md)

## What is Screeps?

Screeps is a persistent MMO programming game where your JavaScript code controls units and structures in a live world. Unlike most games, you don't play by clicking or moving pieces — your code runs 24/7, making decisions, building, defending, and competing with other players. The game rewards automation, strategy, and maintainable code. You can play in the [official MMO](https://screeps.com/), [community servers](https://docs.screeps.com/community-servers.html), or [local simulation](https://screeps.com/a/#!/sim/tutorial).

## Why ScreepsWorld?

ScreepsWorld is a learning-first, modular JavaScript bot architecture for Screeps. This repo is designed for:

- **Learners:** Anyone who wants to master automation, logistics, and systems engineering in JavaScript.
- **Contributors:** Developers who want to build, test, and extend a real-world bot in a collaborative, professional environment.
- **Experimenters:** Players who want to try new strategies, refactor code, and see the results in a persistent world.

**Key Features:**

- Modular, single-responsibility codebase (easy to read, test, and extend)
- Automated deployment to multiple servers (no manual copying)
- Structured logging and metrics for observability
- Clean separation of game logic, planning, and micro-control
- Rich documentation and onboarding guides

## How ScreepsWorld Works

- All source code lives in [`src/`](../src/) as CommonJS modules.
- Deployment tools ([`link.js`](../tools/link.js), [`copy.js`](../tools/copy.js), [`clear.js`](../tools/clear.js)) sync code to server `/default/` directories.
- You develop and test in [`src/`](../src/), then deploy to the MMO, Newbie Land, or local simulation.
- The architecture enforces best practices: single-writer Memory, ID-based persistence, bucket-gated planning, and clear module contracts.

## Getting Started: Step-by-Step

1. **Learn the basics of Screeps:**
   - Visit [Screeps documentation](https://docs.screeps.com/) and [Screeps Wiki](https://wiki.screepspl.us)
   - Join the [Screeps Discord](https://discord.gg/screeps) ([discord.gg/RjSS5fQuFx](https://discord.com/invite/RjSS5fQuFx)) for help and community
   - Try the in-game tutorial and simulation mode

2. **Set up ScreepsWorld locally:**
   - Clone the repo and install dependencies (see below)
   - Explore the [`src/`](../src/) directory to see how modules are organized
   - Read [`README.md`](../README.md) and [`docs/architecture.md`](architecture.md) for design principles

3. **Configure your deployment targets:**
   - Edit [`src/tools/server_dirs.js`](../tools/server_dirs.js) to match your MMO/private server setup
   - Use symlink or copy deployment to keep your code in sync ([`link.js`](../tools/link.js), [`copy.js`](../tools/copy.js))

4. **Start coding and testing:**
   - Edit or add a role module (e.g., [`src/role/harvester.js`](../src/role/harvester.js))
   - Run unit tests with `npm test` (if available; see [`tests/`](../tests/))
   - Deploy your changes and watch them run in the Screeps client

## Example Workflow

- Edit [`src/role/harvester.js`](../src/role/harvester.js) to improve resource gathering
- Test your changes locally with `npm test`
- Run `npm run screeps:copy` to instantly copy your code to the server
- Run `npm run screeps:link` to instantly update your server
- Watch your creeps in the MMO or simulation respond to your new logic
- Use logs and metrics to debug and optimize
- Refactor, test, and repeat!

## Deployment Tools & Preview Mode

To deploy your code to Screeps servers, use the following commands:

- Update symlinks:

  ```sh
  npm run screeps:link
  npm run screeps:link:preview # Preview mode; uses --preview flag; no changes made
  ```

- Copy files and auto-update on changes:

  ```sh
  npm run screeps:copy
  npm run screeps:copy:preview # Preview mode; uses --preview flag; no changes made
  ```

- Clear all files in `/default` directories:

  ```sh
  npm run screeps:clear
  npm run screeps:clear:preview # Preview mode; uses --preview flag; no changes made
  ```

## What to Expect as a Newcomer

- **Immediate feedback:** Your code runs live in the game world—every tick matters
- **Real-world engineering:** You'll learn about automation, supply chains, resource management, and defensive strategy
- **Collaboration:** The repo is designed for team development, with clear contracts and modular boundaries
- **Growth:** As you progress, you'll unlock new roles, managers, and services, scaling your bot from a single room to a multi-room empire

## Troubleshooting & Support

- **Deployment issues:** Check [`server_dirs.js`](../tools/server_dirs.js) and permissions
- **Symlink problems:** On Windows, use copy deployment or run as administrator
- **Test failures:** Use `npm test` and review logs ([`tests/`](../tests/))
- **Logs & metrics:** Use structured logs to diagnose and tune your bot ([`util/logger.js`](../src/util/logger.js))
- **Community:** Ask questions in Discord or open issues on [GitHub](https://github.com/Ghostridr/ScreepsWorld)

## Next Steps

- Read [`README.md`](../README.md) and [`docs/architecture.md`](architecture.md) for a deep dive
- Try editing a role or manager module and deploy your changes
- Explore the codebase, ask questions, and contribute improvements

## Community & Enterprise Support

- [Screeps Discord](https://discord.gg/screeps)/[RjSS5fQuFx](https://discord.com/invite/RjSS5fQuFx)
- [Screeps Documentation](https://docs.screeps.com/)
- [ScreepsWorld GitHub](https://github.com/Ghostridr/ScreepsWorld)
- See [`CONTRIBUTING.md`](../CONTRIBUTING.md) for onboarding and contribution guidelines

---

[![Back to top](https://img.shields.io/badge/Back%20to%20top-222?style=plastic&logo=github)](#getting-started-with-screepsworld)
