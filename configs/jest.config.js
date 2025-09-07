// Support --debug CLI flag for Jest (e.g., npm run test tests/main.test.js -- --debug)
const argv = process.argv.join(' ');
const JEST_RESOLVER_DEBUG = argv.includes('--debug') || process.env.JEST_RESOLVER_DEBUG === '1' || false;

module.exports = {
  rootDir: '..',
  setupFiles: ['./configs/jest.setup.js'],
  moduleNameMapper: {
    '^behavior.([a-zA-Z0-9_]+)$': '<rootDir>/src/behavior/$1.js',
    '^catalog.([a-zA-Z0-9_]+)$': '<rootDir>/src/catalog/$1.js',
    '^config.([a-zA-Z0-9_]+)$': '<rootDir>/src/config/$1.js',
    '^driver.([a-zA-Z0-9_]+)$': '<rootDir>/src/driver/$1.js',
    '^helper.([a-zA-Z0-9_]+)$': '<rootDir>/src/helper/$1.js',
    '^manager.([a-zA-Z0-9_]+)$': '<rootDir>/src/manager/$1.js',
    '^role.([a-zA-Z0-9_]+)$': '<rootDir>/src/role/$1.js',
    '^service.([a-zA-Z0-9_.]+)$': '<rootDir>/src/service/$1.js',
    '^task.([a-zA-Z0-9_]+)$': '<rootDir>/src/task/$1.js',
    '^util.([a-zA-Z0-9_]+)$': '<rootDir>/src/util/$1.js',
    '^main$': '<rootDir>/src/main.js'
  },
  resolver: '<rootDir>/configs/jest.resolver.js',
  JEST_RESOLVER_DEBUG
};