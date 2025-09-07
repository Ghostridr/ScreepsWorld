/* eslint-env screeps */
// service.sources.js — Source registry and simple seat claims for miners
// Single writer of Memory.rooms[room].sources
const Threat = require('service.auto.detect');

function ensureRoom(roomName) {
    if (!Memory.rooms) Memory.rooms = {};
    if (!Memory.rooms[roomName]) Memory.rooms[roomName] = {};
    const R = Memory.rooms[roomName];
    if (!R.sources) R.sources = { indexedAt: 0, byId: {} };
    return R.sources;
}

function index(room) {
    const rec = ensureRoom(room.name);
    // reindex at most every 200 ticks
    if (rec.indexedAt && Game.time - rec.indexedAt < 200) return rec;
    const byId = (rec.byId = {});
    const sources = room.find(FIND_SOURCES);
    for (const src of sources) {
        const cont = src.pos.findInRange(FIND_STRUCTURES, 1, {
            filter: (s) => s.structureType === STRUCTURE_CONTAINER,
        });
        const id = src.id;
        const prev = (rec.byId && rec.byId[id]) || {};
        byId[id] = {
            containers: cont.map((c) => c.id),
            claims: prev.claims || {},
            bare: prev.bare || {},
        };
    }
    rec.indexedAt = Game.time;
    return rec;
}

// Helper: approximate load (claimed miner seats) for a source
function countMinerClaims(srcRec) {
    var n = 0;
    var claims = srcRec && srcRec.claims;
    if (!claims) return 0;
    for (var k in claims) if (Object.prototype.hasOwnProperty.call(claims, k)) n += 1;
    return n;
}

// Compute approximate range from a position to a source/its containers
function approxRangeToSource(sourceId, pos) {
    if (!pos) return 50;
    var src = Game.getObjectById(sourceId);
    return src ? pos.getRangeTo(src) : 50;
}

function minContainerRange(rec, pos) {
    if (!pos) return 50;
    var best = null;
    var containers = (rec && rec.containers) || [];
    for (var i = 0; i < containers.length; i++) {
        var cid = containers[i];
        var c = Game.getObjectById(cid);
        if (c) {
            var d = pos.getRangeTo(c);
            if (best == null || d < best) best = d;
        }
    }
    return best == null ? 50 : best;
}

module.exports = {
    // Provide closest active source id for fetching energy
    closestSourceId(creep) {
        var s =
            creep.pos.findClosestByPath(FIND_SOURCES, { filter: (src) => src.energy > 0 }) ||
            creep.pos.findClosestByPath(FIND_SOURCES);
        return s && s.id;
    },

    // Plan/index occasionally (cheap)
    plan(room) {
        index(room);
    },

    // Claim a miner seat tied to a container if available; returns { sourceId, containerId|null }
    // Tie-breaker: when loads are equal, prefer nearest source/seat to the given position.
    claimMinerSeat(roomName, creepName, pos) {
        const room = Game.rooms[roomName];
        if (!room) return null;
        const rec = index(room);
        const entries = [];
        for (const id in rec.byId) {
            if (!Object.prototype.hasOwnProperty.call(rec.byId, id)) continue;
            const r = rec.byId[id];
            // Prefer distance to containers; fallback to source range
            const seatRange = minContainerRange(r, pos);
            const srcRange = approxRangeToSource(id, pos);
            entries.push({
                id,
                rec: r,
                load: countMinerClaims(r),
                dist: seatRange < 50 ? seatRange : srcRange,
            });
        }
        // choose the least claimed source first (balances 1 each, then 2 each, ...)
        // tie-break by distance to creep position
        entries.sort(function (a, b) {
            if (a.load !== b.load) return a.load - b.load;
            return a.dist - b.dist;
        });
        for (const e of entries) {
            const r = e.rec;
            const claims = r.claims || (r.claims = {});
            // one seat per container
            for (const cid of r.containers || []) {
                if (!claims[cid]) {
                    claims[cid] = creepName;
                    return { sourceId: e.id, containerId: cid };
                }
            }
            // if no containers: allow a single shared seat 'none'
            if (!r.containers || r.containers.length === 0) {
                if (!claims.none) {
                    claims.none = creepName;
                    return { sourceId: e.id, containerId: null };
                }
            }
        }
        // All seats taken
        return null;
    },

    // Find the nearest unclaimed container seat in the room relative to a position
    findNearestFreeContainer(roomName, pos) {
        const room = Game.rooms[roomName];
        if (!room) return null;
        const rec = index(room);
        let best = null;
        for (const sid in rec.byId) {
            if (!Object.prototype.hasOwnProperty.call(rec.byId, sid)) continue;
            const r = rec.byId[sid];
            const claims = r.claims || {};
            const containers = r.containers || [];
            for (let i = 0; i < containers.length; i++) {
                const cid = containers[i];
                if (claims[cid]) continue;
                const obj = Game.getObjectById(cid);
                if (!obj) continue;
                const d = pos ? pos.getRangeTo(obj) : 50;
                if (!best || d < best.dist) best = { sourceId: sid, containerId: cid, dist: d };
            }
        }
        return best ? { sourceId: best.sourceId, containerId: best.containerId } : null;
    },

    // Claim a specific container seat if free; releases any previous seat held by this creep
    claimSpecificSeat(roomName, creepName, containerId) {
        const room = Game.rooms[roomName];
        if (!room) return null;
        const rec = index(room);
        // First, release existing seat for this creep
        const R = Memory.rooms[roomName];
        const S = R && R.sources && R.sources.byId;
        if (S) {
            for (const sid in S) {
                if (!Object.prototype.hasOwnProperty.call(S, sid)) continue;
                const claims = S[sid].claims || {};
                for (const seat in claims) {
                    if (claims[seat] === creepName) delete claims[seat];
                }
                // Also drop bare claim if present
                const bare = S[sid].bare || {};
                if (bare[creepName]) delete bare[creepName];
            }
        }
        // Now find the matching source and claim the container seat if unclaimed
        for (const sid in rec.byId) {
            if (!Object.prototype.hasOwnProperty.call(rec.byId, sid)) continue;
            const r = rec.byId[sid];
            const containers = r.containers || [];
            for (let i = 0; i < containers.length; i++) {
                const cid = containers[i];
                if (cid === containerId) {
                    const claims = r.claims || (r.claims = {});
                    if (claims[cid]) return null; // already taken
                    claims[cid] = creepName;
                    return { sourceId: sid, containerId: cid };
                }
            }
        }
        return null;
    },

    // Release any seat owned by creepName (call on abort/role change)
    releaseMinerSeat(roomName, creepName) {
        const R = Memory.rooms[roomName];
        const S = R && R.sources && R.sources.byId;
        if (!S) return;
        for (const id in S) {
            if (!Object.prototype.hasOwnProperty.call(S, id)) continue;
            const claims = S[id].claims || {};
            for (const seat in claims) {
                if (claims[seat] === creepName) delete claims[seat];
            }
            const bare = S[id].bare || {};
            if (bare[creepName]) delete bare[creepName];
        }
    },

    // Compute sources ordered by range to nearest spawn in the room
    spawnOrderedSources(roomName) {
        const room = Game.rooms[roomName];
        if (!room) return [];
        const rec = index(room);
        const spawns = room.find(FIND_MY_SPAWNS) || [];
        const ids = [];
        for (const sid in rec.byId) ids.push(sid);
        ids.sort(function (a, b) {
            const sa = Game.getObjectById(a);
            const sb = Game.getObjectById(b);
            function dToNearest(pos) {
                var best = 9999;
                for (var i = 0; i < spawns.length; i++) {
                    var d = pos.getRangeTo(spawns[i]);
                    if (d < best) best = d;
                }
                return best;
            }
            const da = sa ? dToNearest(sa.pos) : 9999;
            const db = sb ? dToNearest(sb.pos) : 9999;
            return da - db;
        });
        return ids;
    },

    // Claim a bare assignment to a source (no container). Returns { sourceId }
    claimBare(roomName, creepName) {
        const room = Game.rooms[roomName];
        if (!room) return null;
        const rec = index(room);
        const order = this.spawnOrderedSources(roomName);
        // Build bare counts per source
        const counts = {};
        var total = 0;
        for (var i = 0; i < order.length; i++) {
            var sid = order[i];
            var r = rec.byId[sid];
            var bare = (r && r.bare) || {};
            var n = 0;
            for (var k in bare) if (Object.prototype.hasOwnProperty.call(bare, k)) n += 1;
            counts[sid] = n;
            total += n;
        }
        // Select source:
        var pick = null;
        if (total < 2 && order.length > 0) {
            // First two miners both go to nearest source
            pick = order[0];
        } else {
            // Choose source with fewest bare miners; tie-break to later in spawn order (second nearest)
            var min = 1e9;
            var bestIdx = -1;
            for (var j = 0; j < order.length; j++) {
                var sid2 = order[j];
                var c = counts[sid2] || 0;
                if (c < min || (c === min && j > bestIdx)) {
                    min = c;
                    bestIdx = j;
                }
            }
            if (bestIdx >= 0) pick = order[bestIdx];
        }
        if (!pick) return null;
        // Register bare claim
        var entry = rec.byId[pick];
        entry.bare = entry.bare || {};
        entry.bare[creepName] = 1;
        return { sourceId: pick };
    },

    // Remove bare assignment for this creep, if any
    releaseBare(roomName, creepName) {
        const R = Memory.rooms[roomName];
        const S = R && R.sources && R.sources.byId;
        if (!S) return;
        for (const sid in S) {
            if (!Object.prototype.hasOwnProperty.call(S, sid)) continue;
            const bare = S[sid].bare || {};
            if (bare[creepName]) delete bare[creepName];
        }
    },

    // Find and claim the best free container seat for this creep. Prefers sources with fewer seat claims, then spawn order.
    findAndClaimFreeSeat(roomName, creepName) {
        const room = Game.rooms[roomName];
        if (!room) return null;
        const rec = index(room);
        const order = this.spawnOrderedSources(roomName);
        // Build entries with seat load
        const entries = [];
        for (var oi = 0; oi < order.length; oi++) {
            var sid = order[oi];
            var r = rec.byId[sid];
            var claims = r.claims || {};
            var load = 0;
            for (var ci = 0; ci < (r.containers || []).length; ci++) {
                var cid = r.containers[ci];
                if (claims[cid]) load += 1;
            }
            entries.push({ sid: sid, r: r, load: load, orderIdx: oi });
        }
        entries.sort(function (a, b) {
            if (a.load !== b.load) return a.load - b.load;
            return a.orderIdx - b.orderIdx;
        });
        for (var ei = 0; ei < entries.length; ei++) {
            var e = entries[ei];
            var r2 = e.r;
            var claims2 = r2.claims || (r2.claims = {});
            for (var ci2 = 0; ci2 < (r2.containers || []).length; ci2++) {
                var cid2 = r2.containers[ci2];
                if (!claims2[cid2]) {
                    claims2[cid2] = creepName;
                    // Drop any bare claim this creep held
                    this.releaseBare(roomName, creepName);
                    return { sourceId: e.sid, containerId: cid2 };
                }
            }
        }
        return null;
    },

    // Threat-aware: claim the nearest free container seat to pos, skipping seats in danger.
    // Returns { sourceId, containerId } or null if none safe.
    findAndClaimNearestFreeSeatSafe(roomName, creepName, pos) {
        const room = Game.rooms[roomName];
        if (!room) return null;
        const rec = index(room);
        const candidates = [];
        for (const sid in rec.byId) {
            if (!Object.prototype.hasOwnProperty.call(rec.byId, sid)) continue;
            const r = rec.byId[sid];
            const claims = r.claims || {};
            const containers = r.containers || [];
            for (let i = 0; i < containers.length; i++) {
                const cid = containers[i];
                if (claims[cid]) continue;
                const obj = Game.getObjectById(cid);
                if (!obj) continue;
                if (Threat && Threat.isDanger && Threat.isDanger(obj.pos, room.name)) continue;
                const d = pos && pos.getRangeTo ? pos.getRangeTo(obj) : 50;
                candidates.push({ sid, cid, d });
            }
        }
        if (!candidates.length) return null;
        candidates.sort((a, b) => a.d - b.d);
        const pick = candidates[0];
        // Claim it atomically in Memory (single writer)
        const r = rec.byId[pick.sid];
        const claims = r.claims || (r.claims = {});
        if (claims[pick.cid]) return null; // lost race
        claims[pick.cid] = creepName;
        // Drop any bare claim this creep held
        this.releaseBare(roomName, creepName);
        return { sourceId: pick.sid, containerId: pick.cid };
    },
};
