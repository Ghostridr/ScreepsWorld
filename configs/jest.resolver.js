// Custom Jest resolver for Screeps flat requires
const path = require('path');

// ScreepsWorld Jest resolver — professional flat require mapping
const FLAT_PREFIXES = [
  'behavior', 'catalog', 'config', 'driver', 'helper',
  'manager', 'role', 'service', 'task', 'util'
];

module.exports = function screepsFlatResolver(request, options) {
  // Map two-part flat requires: e.g., manager.spawner → src/manager/spawner.js
  // Debug: log every module request to help diagnose resolution issues
  const debug = options && (options.resolverDebug !== undefined ? options.resolverDebug : process.env.JEST_RESOLVER_DEBUG);
  if (debug) {
    console.log(`[JEST_RESOLVER] request='${request}' rootDir='${options.rootDir}'`);
  }
  const twoPart = request.match(/^([a-z]+)\.([a-zA-Z0-9_]+)$/);
  if (twoPart && FLAT_PREFIXES.includes(twoPart[1])) {
    const fs = require('fs');
    const candidate = path.resolve(options.rootDir, 'src', twoPart[1], twoPart[2] + '.js');
    if (debug) {
      console.log(`[JEST_RESOLVER] twoPart='${twoPart[0]}' candidate='${candidate}' exists=${fs.existsSync(candidate)}`);
    }
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  // Map single-part flat requires: e.g., 'config' → src/config.js
    const NODE_CORE_MODULES = [
      'fs','path','os','util','events','http','https','stream','crypto','buffer','child_process','timers','url','querystring','zlib','net','dns','dgram','readline','repl','vm','assert','tty','domain','punycode','string_decoder','constants','module','process','console','v8','async_hooks','perf_hooks','inspector','worker_threads','cluster','trace_events'
    ];
    const JEST_INTERNALS = [
      'expect','jest','@jest/globals','@jest/expect','@jest/types','@jest/reporters','@jest/environment','@jest/transform','@jest/core','@jest/test-result','@jest/console','@jest/fake-timers','@jest/source-map','@jest/runner','@jest/serializer','@jest/snapshot','@jest/utils','@jest/legacy-test-env','@jest/legacy-reporters','@jest/legacy-transform','@jest/legacy-core','@jest/legacy-runner','@jest/legacy-utils','@jest/legacy-snapshot','@jest/legacy-serializer','@jest/legacy-console','@jest/legacy-fake-timers','@jest/legacy-source-map','@jest/legacy-test-result'
    ];
    // Only map single-part requires if src/<name>.js exists
    if (
      /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(request) &&
      !FLAT_PREFIXES.includes(request) &&
      !NODE_CORE_MODULES.includes(request) &&
      !JEST_INTERNALS.includes(request)
    ) {
      const fs = require('fs');
      const candidate = path.resolve(options.rootDir, 'src', request + '.js');
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  // Map single-part flat require for main only: main → src/main.js
  if (/^main$/.test(request)) {
    return path.resolve(options.rootDir, 'src', 'main.js');
  }
  // Fallback to default
  return options.defaultResolver(request, options);
};
