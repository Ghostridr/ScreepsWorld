/* eslint-env screeps */
// service.build.js — Simple site claims so near-complete sites get exclusive builders
// Single writer of Memory.rooms[room].buildClaims

const HOLD_TICKS = 30; // minimal time to hold a claim before releasing (reduces thrash)

function ensure(roomName) {
    if (!Memory.rooms) Memory.rooms = {};
    if (!Memory.rooms[roomName]) Memory.rooms[roomName] = {};
    const R = Memory.rooms[roomName];
    if (!R.buildClaims) R.buildClaims = { bySite: {}, byCreep: {} };
    return R.buildClaims;
}

function progressPct(site) {
    return site.progressTotal > 0 ? (100 * site.progress) / site.progressTotal : 0;
}

module.exports = {
    // internal: get creep claim object
    _getClaim(mem, creepName) {
        const c = mem.byCreep[creepName];
        if (!c) return null;
        if (typeof c === 'string') return { siteId: c, holdUntil: 0 };
        return c;
    },

    // Claim a site: if >=95% then exclusive; else shared ok (no claim stored)
    claim(roomName, creepName, site) {
        const pct = progressPct(site);
        if (pct < 95) {
            // shared work, do not claim
            return { exclusive: false };
        }
        const mem = ensure(roomName);
        const sid = site.id;
        const owner = mem.bySite[sid];
        if (owner && owner !== creepName) return null; // already owned by someone else
        mem.bySite[sid] = creepName;
        const holdUntil = Game.time + HOLD_TICKS;
        mem.byCreep[creepName] = { siteId: sid, holdUntil };
        return { exclusive: true, siteId: sid };
    },

    // Get currently claimed site for a creep (if any)
    claimedSiteId(roomName, creepName) {
        const mem = ensure(roomName);
        const c = this._getClaim(mem, creepName);
        return c ? c.siteId : null;
    },

    // Release when finished or on abort
    release(roomName, creepName, force) {
        const mem = ensure(roomName);
        const c = this._getClaim(mem, creepName);
        if (!c) return;
        if (!force && typeof c.holdUntil === 'number' && Game.time < c.holdUntil) {
            // still holding; skip release to avoid thrash
            return;
        }
        const sid = c.siteId;
        if (sid) delete mem.bySite[sid];
        delete mem.byCreep[creepName];
    },

    // Cleanup for completed/vanished sites; call periodically
    sweep(room) {
        const mem = ensure(room.name);
        // Remove claims for missing sites or dead creeps
        for (const creepName in mem.byCreep) {
            const c = this._getClaim(mem, creepName);
            if (!c) {
                delete mem.byCreep[creepName];
                continue;
            }
            const sid = c.siteId;
            const site = sid ? Game.getObjectById(sid) : null;
            if (!site || !Game.creeps[creepName]) {
                if (sid) delete mem.bySite[sid];
                delete mem.byCreep[creepName];
            }
        }
        // Prune bySite entries without a corresponding creep claim
        for (const sid in mem.bySite) {
            const owner = mem.bySite[sid];
            const c = this._getClaim(mem, owner);
            if (!c || c.siteId !== sid) delete mem.bySite[sid];
        }
    },
};
