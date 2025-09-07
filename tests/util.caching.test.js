/* eslint-env jest */
const Cache = require('../src/util.caching');

describe('util.caching', () => {
    test('set/get with ttl', () => {
        const root = {};
        global.Game = { time: 100 };
        Cache.set(root, 'a', 42, 5);
        expect(Cache.get(root, 'a')).toBe(42);
        global.Game.time = 106;
        expect(Cache.get(root, 'a')).toBe(null);
        expect(root.a).toBeUndefined();
    });

    test('memo computes once and stores', () => {
        const root = {};
        global.Game = { time: 200 };
        const spy = jest.fn(() => 'v');
        expect(Cache.memo(root, 'k', spy, 10)).toBe('v');
        expect(spy).toHaveBeenCalledTimes(1);
        expect(Cache.memo(root, 'k', spy, 10)).toBe('v');
        expect(spy).toHaveBeenCalledTimes(1);
    });

    test('tick memo resets per tick', () => {
        global.Game = { time: 300 };
        const a = Cache.tickMemo('x', () => Math.random());
        const b = Cache.tickMemo('x', () => Math.random());
        expect(a).toBe(b);
        global.Game.time = 301;
        const c = Cache.tickMemo('x', () => 123);
        expect(c).not.toBe(b);
        expect(c).toBe(123);
    });
});
