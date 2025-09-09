function makeStore(initial = { energy: 0 }, opts = {}) {
    return {
        getFreeCapacity: jest.fn((resource) => {
            // Use resource argument for resource-specific capacity if provided
            if (opts.capacities && resource in opts.capacities) {
                return opts.capacities[resource];
            }
            return opts.capacity || 50;
        }),
        getUsedCapacity: jest.fn((resource) => {
            // Use resource argument for resource-specific used capacity
            if (initial && resource in initial) {
                return initial[resource];
            }
            return 0;
        }),
        [global.RESOURCE_ENERGY]: initial.energy || 0,
        ...initial,
    };
}
module.exports = { makeStore };
