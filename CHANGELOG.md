# Changelog

## Commits

### 🟢 feat(logger): add guidance catalog integration and enhance logging functionality with tests

- 🟢 *Commit:* [42a2162ebee69269e041aeef154a75587437a45d](https://github.com/Ghostridr/ScreepsWorld/commit/42a2162ebee69269e041aeef154a75587437a45d)
- 👤 *Author:* Ghostridr
- 📅 *Date:* 2025-09-09 06:40:44
- 📦 *Changed src/ JS files:*
  - src/util/logger.js

### 🟢 feat(creeps): integrate Creeps registry for role dispatch and logging

- 🟢 *Commit:* [c51e1371de81dc2926bed3ff7f641f566e0e7c02](https://github.com/Ghostridr/ScreepsWorld/commit/c51e1371de81dc2926bed3ff7f641f566e0e7c02)
- 👤 *Author:* Ghostridr
- 📅 *Date:* 2025-09-09 04:58:17
- 📦 *Changed src/ JS files:*
  - src/main.js
  - src/service/creeps.js

### 🟢 feat(creeps): add registry and query helpers for creeps with tests

- 🟢 *Commit:* [6e5e526b9244acae68ffb679121d64905d51b23e](https://github.com/Ghostridr/ScreepsWorld/commit/6e5e526b9244acae68ffb679121d64905d51b23e)
- 👤 *Author:* Ghostridr
- 📅 *Date:* 2025-09-09 04:35:27
- 📦 *Changed src/ JS files:*
  - src/service/creeps.js

### 🟢 fix(auto.detect): add null checks for room and find method in threat detection functions

- 🟢 *Commit:* [09baaf657427758f6861a546cdb67e39094fa1a2](https://github.com/Ghostridr/ScreepsWorld/commit/09baaf657427758f6861a546cdb67e39094fa1a2)
- 👤 *Author:* Ghostridr
- 📅 *Date:* 2025-09-09 04:20:03
- 📦 *Changed src/ JS files:*
  - src/service/auto.detect.js

### 🟢 refactor(roles): consolidate creep role handling into a centralized Roles module

- 🟢 *Commit:* [76b4b751d8a0d870980b0ff6e1352bed2445da15](https://github.com/Ghostridr/ScreepsWorld/commit/76b4b751d8a0d870980b0ff6e1352bed2445da15)
- 👤 *Author:* Ghostridr
- 📅 *Date:* 2025-09-09 03:59:59
- 📦 *Changed src/ JS files:*
  - src/driver/roles.js
  - src/main.js

### 🟢 refactor(main): restructure module imports and enhance loop functionality

- 🟢 *Commit:* [64d2d48b7d6b64c9970a49271da35a289e7437c7](https://github.com/Ghostridr/ScreepsWorld/commit/64d2d48b7d6b64c9970a49271da35a289e7437c7)
- 👤 *Author:* Ghostridr
- 📅 *Date:* 2025-09-09 03:47:09
- 📦 *Changed src/ JS files:*
  - src/main.js

### 🟢 fix: use strict equality checks for target coordinates in position factory

- 🟢 *Commit:* [76fb898929f5619b82741d76c96ce2bb62e4ee0f](https://github.com/Ghostridr/ScreepsWorld/commit/76fb898929f5619b82741d76c96ce2bb62e4ee0f)
- 👤 *Author:* Ghostridr
- 📅 *Date:* 2025-09-09 03:38:58
- 📦 *Changed src/ JS files:*
  - src/master.index.js

### 🟢 refactor: update service imports to behavior modules across various roles and managers

- 🟢 *Commit:* [5027119bf4143f7f9acfcee20fc906d2c3b2b867](https://github.com/Ghostridr/ScreepsWorld/commit/5027119bf4143f7f9acfcee20fc906d2c3b2b867)
- 👤 *Author:* Ghostridr
- 📅 *Date:* 2025-09-07 05:34:58
- 📦 *Changed src/ JS files:*
  - src/config/scaler.js
  - src/main.js
  - src/manager/tower.js
  - src/role/builder.js
  - src/role/harvester.js
  - src/role/hauler.js
  - src/role/healer.js
  - src/role/miner.js
  - src/role/repairer.js
  - src/role/upgrader.js

### 🟢 fix: correct path for tutorials directory in strictify-equality script

- 🟢 *Commit:* [32758d3a21a41b30238c5b7a7339e1d7d200d0bc](https://github.com/Ghostridr/ScreepsWorld/commit/32758d3a21a41b30238c5b7a7339e1d7d200d0bc)
- 👤 *Author:* Ghostridr
- 📅 *Date:* 2025-09-07 03:32:39
- 📦 *Changed src/ JS files:*
  - src/behavior/build.js
  - src/behavior/construction.js
  - src/behavior/haul.js
  - src/behavior/heal.js
  - src/behavior/pathing.js
  - src/behavior/repair.js
  - src/behavior/say.js
  - src/behavior/sources.js
  - src/catalog/guidance.js
  - src/catalog/names.js
  - src/config/colors.js
  - src/config/constants.js
  - src/config/debug.js
  - src/config/paths.js
  - src/config/scaler.js
  - src/helper/guidance.js
  - src/main.js
  - src/manager/container.js
  - src/manager/extension.js
  - src/manager/road.js
  - src/manager/spawner.js
  - src/manager/tower.js
  - src/manager/wall.js
  - src/role/builder.js
  - src/role/harvester.js
  - src/role/hauler.js
  - src/role/healer.js
  - src/role/miner.js
  - src/role/repairer.js
  - src/role/upgrader.js
  - src/service/auto.detect.js
  - src/util/caching.js
  - src/util/heartbeat.js
  - src/util/logger.js
  - src/util/mapper.js

### 🟢 Supposedly these were updated though no records of changes shown in diff?

- 🟢 *Commit:* [608c45ede90a09a641232ded428053dbcac515e2](https://github.com/Ghostridr/ScreepsWorld/commit/608c45ede90a09a641232ded428053dbcac515e2)
- 👤 *Author:* Ghostridr
- 📅 *Date:* 2025-09-07 02:17:53
- 📦 *Changed src/ JS files:*
  - src/main.js

### 🟢 fix: corrected lint issue

- 🟢 *Commit:* [9059b5a39f68afaa24f7c6474a608832ccebd49b](https://github.com/Ghostridr/ScreepsWorld/commit/9059b5a39f68afaa24f7c6474a608832ccebd49b)
- 👤 *Author:* Ghostridr
- 📅 *Date:* 2025-09-06 12:59:41
- 📦 *Changed src/ JS files:*
  - src/main.js

### 🟢 chore: update CI configuration to properly handle tutorials directory and add main.js file

- 🟢 *Commit:* [e12cd2c0ac036ecf69653870b87911b37b91c533](https://github.com/Ghostridr/ScreepsWorld/commit/e12cd2c0ac036ecf69653870b87911b37b91c533)
- 👤 *Author:* Ghostridr
- 📅 *Date:* 2025-09-06 12:18:36
- 📦 *Changed src/ JS files:*
  - src/main.js

### 🟢 feat: add utility modules for caching, heartbeat logging, and mapping

- 🟢 *Commit:* [cd93571580dd4c9b5d719b343225c8bb70d8a6bd](https://github.com/Ghostridr/ScreepsWorld/commit/cd93571580dd4c9b5d719b343225c8bb70d8a6bd)
- 👤 *Author:* Ghostridr
- 📅 *Date:* 2025-09-02 23:46:03
- 📦 *Changed src/ JS files:*
  - src/main.js
  - src/manager.spawner.js
  - src/role.builder.js
  - src/role.harvester.js
  - src/role.upgrader.js

### 🟢 Refactor role checks to use strict equality, enhance error logging in manager.spawner, and improve test coverage for main and manager.spawner modules

- 🟢 *Commit:* [9d6dfe9d7c01bc7623a9c9457bbdcdec38b6a17b](https://github.com/Ghostridr/ScreepsWorld/commit/9d6dfe9d7c01bc7623a9c9457bbdcdec38b6a17b)
- 👤 *Author:* Ghostridr
- 📅 *Date:* 2025-09-01 06:05:47
- 📦 *Changed src/ JS files:*
  - src/main.js
  - src/manager.spawner.js
  - src/role.builder.js
  - src/role.harvester.js
  - src/role.upgrader.js

### 🟢 feat: implement auto-spawn logic for creeps and add initial test for manager.spawner

- 🟢 *Commit:* [b1566fe65230369bbdaa346bed274bec12ab6ca6](https://github.com/Ghostridr/ScreepsWorld/commit/b1566fe65230369bbdaa346bed274bec12ab6ca6)
- 👤 *Author:* Ghostridr
- 📅 *Date:* 2025-08-31 22:59:08
- 📦 *Changed src/ JS files:*
  - src/manager.spawner.js
  - src/tests/manager.spawner.test.js

### 🟢 add comment for default desired counts re-evaluation and recycling

- 🟢 *Commit:* [4975b67b0fc96f95367a460fff7ceb3b6fe903a5](https://github.com/Ghostridr/ScreepsWorld/commit/4975b67b0fc96f95367a460fff7ceb3b6fe903a5)
- 👤 *Author:* Ghostridr
- 📅 *Date:* 2025-08-31 05:43:46
- 📦 *Changed src/ JS files:*
  - main.js
  - manager.spawner.js

### feat(spawner): implement default desired counts for auto-spawning roles

- 🟢 *Commit:* [8bc51248e9d5f72baf56646e165a38e79587a1f4](https://github.com/Ghostridr/ScreepsWorld/commit/8bc51248e9d5f72baf56646e165a38e79587a1f4)
- 👤 *Author:* Ghostridr
- 📅 *Date:* 2025-08-31 05:27:45
- 📦 *Changed src/ JS files:*
  - manager.spawner.js

### fix: remove test comment from main loop in main.js

- 🟢 *Commit:* [81560444d331d80c093713b85e38686e12378f2c](https://github.com/Ghostridr/ScreepsWorld/commit/81560444d331d80c093713b85e38686e12378f2c)
- 👤 *Author:* Ghostridr
- 📅 *Date:* 2025-08-31 05:20:39
- 📦 *Changed src/ JS files:*
  - main.js

### fix: add newline at end of file for TODO comment for auto-spawning logic**

- 🟢 *Commit:* [6160107fd8ea189491e86dfe61f8ad9758e7211e](https://github.com/Ghostridr/ScreepsWorld/commit/6160107fd8ea189491e86dfe61f8ad9758e7211e)
- 👤 *Author:* Ghostridr
- 📅 *Date:* 2025-08-31 09:49:04
- 📦 *Changed src/ JS files:*
  - manager.spawner.js

### Add manager.spawner.js to auto-spawn creeps for defined roles

- 🟢 *Commit:* [0b3c8c5cac7af5ed49aafa90f581444c14d1e571](https://github.com/Ghostridr/ScreepsWorld/commit/0b3c8c5cac7af5ed49aafa90f581444c14d1e571)
- 👤 *Author:* Ghostridr
- 📅 *Date:* 2025-08-31 08:52:22
- 📦 *Changed src/ JS files:*
  - manager.spawner.js

## Issues (closed)

## Pull Requests (approved)
