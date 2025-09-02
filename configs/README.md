# configs/

Centralized tooling config for this repo. These files are sourced by npm scripts and editors to ensure a consistent developer experience.

## Contents

- `eslint.config.mjs` (ESLint flat config)
  - Modern JS rules via `@eslint/js`
  - Screeps + Jest globals predeclared
  - Ignores: `configs/**`, `screeps.com/**`, `tutorials/**`
  - Scoped rules:
    - `src/**` and `screeps_newbieland_net___21025/**`: smart equality (===/!==, allow `== null`)
    - `tests/**`: relaxed console usage

- `prettier.config.cjs` (Prettier config, CommonJS)
  - 4-space indent, single quotes, semicolons
  - `printWidth: 100`, `trailingComma: es5`
  - YAML: 2-space indent
  - Markdown: 2-space indent (matches markdownlint MD007)

## Related files

- `.prettierignore`
  - Excludes: `node_modules/`, `dist/`, `coverage/`, `screeps.com/`, `tutorials/`, `configs/`, all `CHANGELOG.md`

- `.vscode/settings.json`
  - Points Prettier at `configs/prettier.config.cjs`
  - Enables format on save
  - Uses ESLint flat config in the editor

## npm scripts (package.json)

- `npm run lint`
  - Lints only code folders: `src/`, `screeps_newbieland_net___21025/`, `tests/`, `tools/`
  - Uses `configs/eslint.config.mjs`

- `npm run fix`
  - Runs strictify equality (safe `==` ➜ `===`, keeps `== null`), then `eslint --fix`, then Prettier
  - Skips `screeps.com/` and `tutorials/` by default

- `npm run format` / `npm run format:check`
  - Prettier with `configs/prettier.config.cjs` and `.prettierignore`

## CI

The GitHub Actions workflow runs lint and tests unless a PR is training-only (`screeps.com/**`). Paths are detected via `dorny/paths-filter` and job outputs control the matrix.

## Extending

- ESLint: add per-folder overrides or rules inside `eslint.config.mjs`.
- Prettier: adjust style in `prettier.config.cjs` (e.g., `printWidth`, `singleQuote`).
- Ignores: append to `.prettierignore` or tweak lint globs in `package.json` scripts.

---

[![Back to top](https://img.shields.io/badge/Back%20to%20top-222?style=plastic&logo=github)](#configs)
