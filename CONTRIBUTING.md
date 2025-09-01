# Contributing to ScreepsWorld

Thanks for your interest in contributing! This repo is a learning-first Screeps codebase with a focus on small, testable improvements and clear feedback.

## Ground rules

1. Keep it small and safe
   - Prefer incremental changes with a tiny success signal (a log, a test, or a metric).
   - Avoid sweeping refactors without tests and a short rollout plan.
2. Be explicit
   - Add a brief rationale in the PR description: what changed and why.
   - When changing behavior, note the expected user-visible effect (logs, counts, CPU).
3. Match the hint ladder
   - Tutorials and training code may use simpler patterns; production code in `src/` should be stricter and more typed-by-contract.
4. Verbosity
   - Aim for clear, descriptive code and comments. Explain the "why" behind complex logic.
   - Use consistent terminology and naming conventions throughout the codebase.
   - Avoid unnecessary abbreviations and jargon that others may not understand or recognize.
   - Provide context for any complex logic or decisions made in the code.
   - Include examples or analogies to clarify difficult concepts.
5. Testing
   - Write tests for any new features or bug fixes.
   - Ensure all tests pass before submitting a PR.
6. Verbose console logs
   - Use clear and descriptive messages in console logs.
   - Include relevant context (e.g., variable values, function names) to aid debugging.
   - Avoid excessive logging in performance-critical paths.
   - Example:

     ```js
     console.log(`[Spawner] Attempting to spawn ${role} with body ${body}`);
     ```

   - Uses:
     - Debugging: Help identify issues during development.
     - Monitoring: Track system behavior in production.
     - Performance: Analyze and optimize code execution.
   - Usage:
     - `console.assert(``)` for assertions that should always hold true.
     - `console.count(``)` for counting the number of times a particular code path is executed.
     - `console.debug(``)` for detailed debugging information.
     - `console.dir(``)` for logging an interactive listing of an object's properties.
     - `console.error(``)` for errors that require immediate attention.
     - `console.group(``)` for grouping related log messages.
       - `console.groupEnd(``)` for ending a group of log messages.
     - `console.info(``)` for general informational messages.
     - `console.log(``)` for general information.
     - `console.memory` for tracking memory usage.
     - `console.profile(``)` for starting a performance profile.
       - `console.profileEnd(``)` for ending a performance profile and logging the results.
     - `console.table(``)` for logging tabular data.
     - `console.time(``)` for starting a timer.
       - `console.timeEnd(``)` for ending a timer and logging the elapsed time.
     - `console.timeStamp(``)` for adding a timestamp to the performance log.
     - `console.trace(``)` for stack traces.
     - `console.warn(``)` for warnings that may indicate potential issues.

## Repository areas

- Training: `screeps.com/**`
  - Mirrors tutorial-style code; lint is relaxed here (eqeqeq off).
- NewbieLand (live testing): `screeps_newbieland_net___21025/**`
  - Realistic code with “smart” equality (allows `== null` checks), CI lint applies.
- Production (learning lab): `src/**`
  - Strictest lint rules; try to keep logic pure and isolated from Screeps globals.

## Workflow

1. Branch
   - Use a short, descriptive branch name: `feat/spawn-hysteresis` or `fix/tower-cap`.
   - Keep the branch up-to-date with the base branch.
   - New Screeps modules should follow the naming convention `role.<name>.js`.
   - Place new modules in the appropriate directory (`src/`).
     - Any module placed in `src/` can then be copied to any server once it's been tested.
   - Include a test file in `tests/` with a matching name (e.g., `tests/role.<name>.test.js`).
2. Run local checks
   - Fix repo-wide issues: `npm run fix` (strictify equality ➜ eslint --fix)
   - Lint only: `npm run lint`
   - Tests: `npm test` after
3. Commit
   - Use a short, descriptive commit message: `fix: handle missing role module`, `feat: add upgrader body v2`.
   - Pre-commit hook runs automatically (Husky + lint-staged):
     - strictify equality (==/!= ➜ ===/!==, preserves `== null` when intended)
     - eslint on staged JS using `config/eslint.config.mjs`
   - Include relevant issue references in commit messages if applicable.
4. Pull Request
   - CI runs lint and tests. PRs that only touch `screeps.com/**` are labeled `training-only` and skip CI checks.
   - Describe the change, include before/after notes, and screenshots or logs if helpful.
5. Review
   - Request reviews from relevant team members.
   - Address feedback promptly and thoroughly.
6. Merge
   - Once approved, merge the PR following the project's merge strategy.
7. CHANGELOG.md
   - DO NOT update CHANGELOG.md.
     - It is automatically generated from commit messages via workflows.

## Coding guidelines

- Equality: strict (===/!==), with smart allowance for `== null` when checking both null/undefined.
- Globals: avoid direct Screeps global usage in core logic; use thin adapters in `driver.*`.
- Logs: prefer structured, actionable messages (what, where, how to fix).
- Tests: when touching production logic, include a small Jest test (happy path + 1 edge case).

## Common tasks

1. Add a new role
   1. Create `role.<name>.js` exporting `{ run(creep) { ... } }`.
   2. Add the role name to `roleNames` in `manager.spawner.js` (per server as needed).
   3. Run `npm run fix` and `npm test`.
2. Adjust spawn logic
   1. Edit `manager.spawner.js` desired counts/body selection.
   2. Watch logs for spawn attempts and results.
3. Improve tower policy
   1. Edit `manager.tower.js` priorities (heal → repair cap → attack).
   2. Validate CPU and behavior in logs.
4. Adjust wall construction
   1. Edit `manager.wall.js` to optimize wall placement.
   2. Monitor wall usage and adjust as needed.
5. Modularize code
   1. Identify common patterns and extract them into reusable functions/modules.
   2. Ensure new modules follow the naming convention `<label>.<name>.js`.

## Commit messages

- Use present tense, start with a verb: `fix: handle missing role module`, `feat: add upgrader body v2`.
- Keep the first line ≤ 72 chars; add details in subsequent lines if needed.

## Reporting issues

Open an issue with:

- What you expected vs. what happened
- Logs or minimal reproduction
- Where in the repo it lives (file/section), if known

## License

By contributing, you agree that your contributions are licensed under the project’s [GNU AGPL v3](LICENSE) license.

---

[![Back to top](https://img.shields.io/badge/Back%20to%20top-222?style=plastic&logo=github)](#contributing-to-screepsworld)
