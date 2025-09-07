/* eslint-env jest */
const Mapper = require('../src/util.mapper');

describe('util.mapper', () => {
    test('toPosKey/fromPosKey roundtrip', () => {
        const key = Mapper.toPosKey({ x: 10, y: 20, roomName: 'W1N1' });
        expect(key).toBe('W1N1:10:20');
        const pos = Mapper.fromPosKey(key);
        expect(pos).toEqual({ x: 10, y: 20, roomName: 'W1N1' });
    });

    test('indexBy/groupBy/countBy basics', () => {
        const items = [
            { id: 'a', t: 'x' },
            { id: 'b', t: 'x' },
            { id: 'c', t: 'y' },
        ];
        const byId = Mapper.indexBy(items, 'id');
        expect(byId.a.id).toBe('a');
        const grouped = Mapper.groupBy(items, (v) => v.t);
        expect(grouped.x).toHaveLength(2);
        const counted = Mapper.countBy(items, (v) => v.t);
        expect(counted).toEqual({ x: 2, y: 1 });
    });

    test('reuseKey is order independent', () => {
        const k1 = Mapper.reuseKey('A', 'B');
        const k2 = Mapper.reuseKey('B', 'A');
        expect(k1).toBe(k2);
    });

    test('objectsToIds/idsToObjects with custom getter', () => {
        const objs = [{ id: '1' }, { id: '2' }, { id: '3' }];
        const ids = Mapper.objectsToIds(objs);
        expect(ids).toEqual(['1', '2', '3']);
        const back = Mapper.idsToObjects(ids, (id) => ({ id }));
        expect(back.map((o) => o.id)).toEqual(ids);
    });
});
