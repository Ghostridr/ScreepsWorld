const Creeps = require('../../src/service/creeps');

describe('Creeps Registry', () => {
    beforeEach(() => {
        global.RESOURCE_ENERGY = 'energy';
        global.Game = {
            creeps: {
                a: {
                    memory: { role: 'harvester', task: 'mine' },
                    room: { name: 'W1N1' },
                    ticksToLive: 100,
                    store: { getUsedCapacity: (res) => (res === 'energy' ? 50 : 0) },
                    body: [{ type: 'WORK' }],
                },
                b: {
                    memory: { role: 'hauler', task: 'haul' },
                    room: { name: 'W1N1' },
                    ticksToLive: 50,
                    store: { getUsedCapacity: (res) => (res === 'energy' ? 100 : 0) },
                    body: [{ type: 'CARRY' }],
                },
            },
        };
    });

    it('filters by role', () => {
        expect(Creeps.byRole('harvester').length).toBe(1);
    });

    it('counts by role', () => {
        expect(Creeps.count('hauler')).toBe(1);
    });

    it('filters by room', () => {
        expect(Creeps.inRoom('W1N1').length).toBe(2);
    });

    it('filters by ticks to live', () => {
        expect(Creeps.byLife(60).length).toBe(1);
    });

    it('filters by task', () => {
        expect(Creeps.byTask('haul').length).toBe(1);
    });

    it('computes avgEnergy', () => {
        expect(Creeps.avgEnergy()).toBe(75);
    });

    it('computes avgTicksToLive', () => {
        expect(Creeps.avgTicksToLive()).toBe(75);
    });

    it('filters by body part', () => {
        expect(Creeps.withBodyPart('WORK').length).toBe(1);
    });

    it('filters by carrying more than', () => {
        expect(Creeps.carryingMoreThan('energy', 60).length).toBe(1);
    });
});
