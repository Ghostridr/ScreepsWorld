// Prettier config (CJS) to avoid ESLint parsing ESM in editors
/** @type {import('prettier').Config} */

module.exports = {
  semi: true,
  singleQuote: true,
  tabWidth: 4,
  useTabs: false,
  printWidth: 100,
  trailingComma: 'es5',
  bracketSpacing: true,
  arrowParens: 'always',
  endOfLine: 'lf',
  overrides: [
    {
      files: ['**/*.yml', '**/*.yaml'],
      options: {
        tabWidth: 2
      },
    },
    {
      files: ['*.md', '**/*.md'],
      options: {
        proseWrap: 'preserve',
        tabWidth: 2,
      },
    },
  ],
};
