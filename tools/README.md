# strictify-equality

Converts loose equality (==, !=) to strict (===, !==) across the repo using an AST.

Key behavior:

- Preserves `== null` / `!= null` checks (ESLint eqeqeq 'smart').
- Skips node_modules, .git, .vscode, and this tool itself.
- Training folder `screeps.com` is excluded by default; you can include it interactively or with a flag.

Usage:

- Non-interactive (default exclude training):
  - npm run strictify:eq -- --no-prompt
- Include training (no prompt):
  - npm run strictify:eq -- --include-training --no-prompt
- Interactive prompt:
  - npm run strictify:eq
