function makeStructure(type, opts = {}) {
    return {
        id: opts.id || 'structure1',
        structureType: type,
        store: opts.store || { getFreeCapacity: () => 50, [global.RESOURCE_ENERGY]: 100 },
    };
}
module.exports = { makeStructure };
