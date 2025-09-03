/* eslint-env screeps */
// service.haul.js — minimal refill job queue (single-writer of Memory.rooms[room].haulQ)

function ensure(roomName) {
    if (!Memory.rooms) Memory.rooms = {};
    if (!Memory.rooms[roomName]) Memory.rooms[roomName] = {};
    var R = Memory.rooms[roomName];
    if (!R.haulQ) R.haulQ = { nextId: 1, ready: [], inProgress: [], jobsById: {} };
    return R.haulQ;
}

function hasJobForDst(q, dstId) {
    for (var i = 0; i < q.ready.length; i++)
        if (q.jobsById[q.ready[i]] && q.jobsById[q.ready[i]].dstId === dstId) return true;
    for (var j = 0; j < q.inProgress.length; j++)
        if (q.jobsById[q.inProgress[j]] && q.jobsById[q.inProgress[j]].dstId === dstId) return true;
    return false;
}

module.exports = {
    enqueueRefill: function (roomName, srcId, dstId, amount) {
        var q = ensure(roomName);
        if (hasJobForDst(q, dstId)) return null;
        var id = q.nextId++;
        q.jobsById[id] = {
            id: id,
            type: 'refill',
            srcId: srcId,
            dstId: dstId,
            amount: amount || 0,
            owner: null,
            state: 'READY',
            created: Game.time,
        };
        q.ready.push(id);
        return id;
    },
    claim: function (roomName, creepName) {
        var q = ensure(roomName);
        if (!q.ready.length) return null;
        // simple FIFO; can be improved with scoring later
        var id = q.ready.shift();
        q.inProgress.push(id);
        var job = q.jobsById[id];
        if (!job) return null;
        job.owner = creepName;
        job.state = 'CLAIMED';
        return { id: id, job: job };
    },
    get: function (roomName, id) {
        var q = ensure(roomName);
        return q.jobsById[id] || null;
    },
    release: function (roomName, id, status) {
        var q = ensure(roomName);
        var job = q.jobsById[id];
        if (!job) return;
        // remove from inProgress if present
        var idx = q.inProgress.indexOf(id);
        if (idx >= 0) q.inProgress.splice(idx, 1);
        if (status === 'DONE') {
            delete q.jobsById[id];
            return;
        }
        // For ABORT or errors: validate endpoints; drop job if invalid to prevent stuck loops
        var srcOk = !!Game.getObjectById(job.srcId);
        var dstObj = Game.getObjectById(job.dstId);
        var dstOk = !!dstObj;
        if (!srcOk || !dstOk) {
            delete q.jobsById[id];
            return;
        }
        // If destination is already full, just complete without requeue
        if (
            dstObj &&
            dstObj.store &&
            typeof dstObj.store.getFreeCapacity === 'function' &&
            dstObj.store.getFreeCapacity(RESOURCE_ENERGY) <= 0
        ) {
            delete q.jobsById[id];
            return;
        }
        // Requeue safely if not already queued
        if (q.ready.indexOf(id) === -1) {
            job.owner = null;
            job.state = 'READY';
            q.ready.push(id);
        }
    },
    size: function (roomName) {
        var q = ensure(roomName);
        return { ready: q.ready.length, inProgress: q.inProgress.length };
    },
};
