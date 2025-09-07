# Tools

Developer utilities used by npm scripts and pre-commit hooks.

Currently included:

- strictify-equality — safe conversion of loose equality to strict equality.

---

## strictify-equality

Converts loose equality operators (`==`, `!=`) to strict (`===`, `!==`) using an AST transform (recast). Strings, comments, and non-JS files are never touched.

What it changes (and what it doesn’t):

- Changes: `a == b` ➜ `a === b`, `a != b` ➜ `a !== b`.
- Preserves smart null checks: `x == null` / `x != null` are left as-is to keep the "null or undefined" semantics.
- JS only: processes `.js` files; TypeScript is not modified.

Always excluded directories/files:

- `node_modules/`, `.git/`, `.vscode/`
- This tool file: `tools/strictify-equality.js`
- ESLint config files (`eslint.config*`)
- Tutorials: `tutorials/**` (always skipped)
- Training code: `screeps.com/**` (skipped by default; can be included)

CLI flags:

- `--include-training` — include `screeps.com/**` in processing
- `--exclude-training` — exclude `screeps.com/**` (default)
- `--no-prompt` — don’t ask interactively; honor the include/exclude flags

Targeting specific files:

- You can pass file paths to process only those files. They’ll still respect the training/tutorials exclusions unless you explicitly include training.

Examples:

- Non-interactive (exclude training by default):
  - npm run strictify:eq -- --no-prompt
- Include training (no prompt):
  - npm run strictify:eq -- --include-training --no-prompt
- Interactive (TTY only):
  - npm run strictify:eq
- Specific files only:
  - npm run strictify:eq -- src/util/logger.js tests/\*_/_.js --no-prompt

Integration:

- npm run fix — runs strictify first, then ESLint --fix, then Prettier. This is the one-stop formatter.
- Pre-commit (lint-staged) — strictify runs automatically on staged .js files before ESLint/Prettier.

Output and behavior:

- Prints "Processed N files. Modified M." and lists modified files.
- On parse errors (rare), the file is skipped with a warning and left unchanged.
- Modifies files in-place; use Git to review/revert as needed.

Limitations and tips:

- Prefer `x == null` for null-or-undefined checks. Patterns like `x == undefined` are not preserved and will be strictified to `x === undefined`.
- The transform operates only on binary equality/inequality operators; it does not rewrite other patterns.

---

Maintainer notes:

- Implementation uses `recast` with the `esprima` parser. See `tools/strictify-equality.js`.
- Defaults are aligned with ESLint’s `eqeqeq: ["error", "smart"]` philosophy.

---

[![Back to top](https://img.shields.io/badge/Back%20to%20top-222?style=plastic&logo=github)](#tools)
