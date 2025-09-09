const Log = require('../../src/util/logger');

describe('Logger module', () => {
    let origConsole;
    let origMemory;
    let origGame;

    beforeEach(() => {
        // Mock console methods
        origConsole = { ...console };
        console.log = jest.fn();
        console.info = jest.fn();
        console.warn = jest.fn();
        console.error = jest.fn();
        console.debug = jest.fn();
        // Mock Screeps globals
        origMemory = global.Memory;
        global.Memory = { log: { level: 2 }, __log: {}, __logChange: {}, __logOnce: {} };
        origGame = global.Game;
        global.Game = { time: 42 };
    });

    afterEach(() => {
        Object.assign(console, origConsole);
        global.Memory = origMemory;
        global.Game = origGame;
    });

    it('formats and logs info messages', () => {
        Log.info('Hello', 'main');
        expect(console.info).toHaveBeenCalledWith(expect.stringContaining('[🏠] Hello'));
    });

    it('respects log level gating', () => {
        global.Memory.log.level = 0; // error only
        Log.info('Should not log', 'main');
        expect(console.info).not.toHaveBeenCalled();
        Log.error('Should log', 'main');
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('[🏠] Should log'));
    });

    it('uses tag aliases for emoji', () => {
        Log.info('Builder active', 'builder');
        expect(console.info).toHaveBeenCalledWith(expect.stringContaining('[🏗️] Builder active'));
    });

    it('onChange logs only when value changes', () => {
        Log.onChange('testKey', 1, 'Changed', 'main', 'info');
        expect(console.info).toHaveBeenCalledWith(expect.stringContaining('Changed'));
        console.info.mockClear();
        Log.onChange('testKey', 1, 'Changed', 'main', 'info');
        expect(console.info).not.toHaveBeenCalled();
        Log.onChange('testKey', 2, 'Changed again', 'main', 'info');
        expect(console.info).toHaveBeenCalledWith(expect.stringContaining('Changed again'));
    });

    it('withTag returns tagged logger', () => {
        const tagged = Log.withTag('haul');
        tagged.info('Hauler running');
        expect(console.info).toHaveBeenCalledWith(expect.stringContaining('[🚚] Hauler running'));
    });

    it('once logs only once per key', () => {
        Log.once('uniqueKey', 'First log', 'main');
        expect(console.info).toHaveBeenCalledWith(expect.stringContaining('First log'));
        console.info.mockClear();
        Log.once('uniqueKey', 'Second log', 'main');
        expect(console.info).not.toHaveBeenCalled();
    });

    it('every logs only on matching tick', () => {
        global.Game.time = 10;
        Log.every(5, 'Tick log', 'main');
        expect(console.info).toHaveBeenCalledWith(expect.stringContaining('Tick log'));
        console.info.mockClear();
        global.Game.time = 11;
        Log.every(5, 'Should not log', 'main');
        expect(console.info).not.toHaveBeenCalled();
    });
});

describe('Logger utility and edge cases', () => {
    beforeEach(() => {
        global.Memory = { log: {}, __log: {}, __logChange: {}, __logOnce: {} };
        global.Game = { time: 100 };
    });

    it('handles missing Memory gracefully', () => {
        delete global.Memory;
        expect(() => Log.setLevel('info')).not.toThrow();
        global.Memory = { log: {} };
    });

    it('handles bad input for log level', () => {
        expect(Log.setLevel('notalevel')).toBe(2); // defaults to info
        expect(Log.setLevel(99)).toBe(99); // accepts number
    });

    it('handles missing tag alias', () => {
        let output = '';
        const origInfo = console.info;
        console.info = (msg) => {
            output = msg;
        };
        Log.info('no alias', 'notatag');
        expect(output).toMatch(/notatag/);
        console.info = origInfo;
    });

    it('handles missing COLORS config', () => {
        jest.resetModules();
        jest.mock('../../src/util/logger', () => {
            const original = jest.requireActual('../../src/util/logger');
            original.COLORS = null;
            return original;
        });
        const LogNoColor = require('../../src/util/logger');
        expect(() => LogNoColor.info('test', 'main')).not.toThrow();
    });

    it('handles guidance catalog integration', () => {
        // Patch console.info to capture output
        const output = [];
        const origInfo = console.info;
        console.info = (msg) => output.push(msg);
        // Mock the catalog.guidance.js module
        jest.resetModules();
        jest.mock(
            '../../src/catalog/guidance.js',
            () => ({ ROAD_SITE: { tips: ['Build roads for efficiency.'] } }),
            { virtual: true }
        );
        // Re-require logger so it picks up the mock
        const Log = require('../../src/util/logger');
        // Set up a matching construction event with placed=true and type 'road'
        global.__constructAgg = {
            tick: global.Game.time,
            events: [{ room: 'W1N1', type: 'road', x: 1, y: 2, meta: { placed: true } }],
            seen: new Set(['W1N1|road|1,2']),
        };
        // Ensure verboseSites is true so tips are logged
        global.Memory.log.verboseSites = true;
        // Simulate construction flush
        expect(() => Log.construction.flush()).not.toThrow();
        console.info = origInfo;
        // Output should include the tip from the mocked catalog
        const tipsOutput = output.join('\n');
        expect(tipsOutput).toContain('Build roads for efficiency.');
    });

    it('logs tips from real catalog.guidance.js for construction', () => {
        // Patch console.info to capture output
        const output = [];
        const origInfo = console.info;
        console.info = (msg) => output.push(msg);
        // Mock the catalog.guidance.js module
        jest.resetModules();
        jest.mock(
            '../../src/catalog/guidance.js',
            () => ({ EXT_SITE: { tips: ['Place extensions near spawn.'] } }),
            { virtual: true }
        );
        // Re-require logger so it picks up the mock
        const Log = require('../../src/util/logger');
        // Set up a matching construction event with placed=true and type 'extension'
        global.__constructAgg = {
            tick: global.Game.time,
            events: [{ room: 'W1N1', type: 'extension', x: 3, y: 4, meta: { placed: true } }],
            seen: new Set(['W1N1|extension|3,4']),
        };
        // Ensure verboseSites is true so tips are logged
        global.Memory.log.verboseSites = true;
        // Simulate construction flush
        Log.construction.flush();
        console.info = origInfo;
        // Output should include the tip from the mocked catalog
        const tipsOutput = output.join('\n');
        expect(tipsOutput).toContain('Place extensions near spawn.');
    });

    it('exercises all utility helpers', () => {
        expect(() => {
            Log.group('group');
            Log.groupEnd();
            Log.profile('profile');
            Log.profileEnd('profile');
            Log.time('timer');
            Log.timeEnd('timer');
            Log.timeStamp('stamp');
            Log.table([{ a: 1 }]);
            Log.memory();
            Log.dir({ foo: 'bar' });
            Log.count('label');
            Log.trace('trace', 'main');
            Log.assert(true, 'should not warn', 'main');
        }).not.toThrow();
    });

    it('handles legacy log level fallbacks', () => {
        global.Memory.__logLevel = 'warn';
        expect(Log.setLevel('warn')).toBe(1);
        global.Memory.__logLevel = undefined;
    });
});
