/* eslint-env screeps */
// role.healer.js — Simple battlefield medic: find injured friendlies, move and heal.
var Log = require('util.logger').withTag('healer');
var G = require('helper.guidance');
var Say = require('service.say');
var Heal = require('service.heal');
var Paths = require('config.paths');
var Mapper = require('util.mapper');
var Cache = require('util.caching');
var Threat = require('service.auto.detect');

module.exports = {
    /** @param {Creep} creep */
    run: function (creep) {
        // Find best target near us; fallback to room best; then global fallback
        var target = Heal.pickNear(creep) || Heal.pick(creep.room) || Heal.pickGlobal();
        if (!target) {
            Say.every(creep, 'IDLE', 80);
            Paths.drawIdle(creep);
            Log.onChange(
                'healer.idle.' + creep.room.name,
                'idle',
                G.info(
                    'No injured creeps in ' + creep.room.name,
                    ['Reduce healer count or reassign temporarily.'],
                    { file: 'role.healer.js', room: creep.room.name },
                    'HEALER_IDLE'
                ),
                'info'
            );
            return;
        }
        // Healing priority: self > adjacent ally > ranged ally; movement can accompany ranged/self
        var didHeal = false;
        var pctForQuip = null; // track last known percent of the healed unit

        // Helper to compute health percent for any creep
        function hpPct(unit) {
            if (!unit || !unit.hitsMax) return null;
            return Math.max(0, Math.min(100, Math.round((unit.hits * 100) / unit.hitsMax)));
        }

        // 0) Self-heal if injured
        if (creep.hits < creep.hitsMax) {
            if (creep.heal(creep) === OK) {
                didHeal = true;
                var sp = hpPct(creep);
                if (sp != null) Say.changed(creep, 'HEAL', { pct: sp });
                else Say.changed(creep, 'HEAL');
                pctForQuip = sp;
            }
        }

        // 1) If not already healed and adjacent to target, direct heal (24/tick)
        var range = creep.pos.getRangeTo(target);
        if (!didHeal && range <= 1) {
            if (creep.heal(target) === OK) {
                didHeal = true;
                var tp = hpPct(target);
                if (tp != null) Say.changed(creep, 'HEAL', { pct: tp });
                else Say.changed(creep, 'HEAL');
                pctForQuip = tp;
            }
        }

        // 2) If still not healed anyone and within 3, rangedHeal (12/tick)
        if (!didHeal && range <= 3) {
            if (creep.rangedHeal(target) === OK) {
                didHeal = true;
                var rp = hpPct(target);
                if (rp != null) Say.changed(creep, 'HEAL', { pct: rp });
                else Say.changed(creep, 'HEAL');
                pctForQuip = rp;
            }
        }

        // Occasional healer flavor line, without interrupting the HEAL bubble this tick
        if (pctForQuip == null) pctForQuip = hpPct(target);
        if (pctForQuip != null) Say.healQuip(creep, pctForQuip);

        // Movement toward target when not adjacent; we can move in same tick as heal/rangedHeal
        if (range > 1) {
            if (!didHeal) Say.changed(creep, 'MOVE');
            // Stuck detection
            var posKey = Mapper.toPosKey(creep.pos);
            var mm =
                creep.memory._moveMon || (creep.memory._moveMon = { lastPos: posKey, stuck: 0 });
            if (mm.lastPos === posKey) mm.stuck = (mm.stuck || 0) + 1;
            else {
                mm.stuck = 0;
                mm.lastPos = posKey;
            }

            var moveOpts = { visualizePathStyle: Paths.roles.healer.move, reusePath: 10 };
            if (mm.stuck >= 3) {
                moveOpts.ignoreCreeps = true; // push through crowds occasionally
                // Invalidate any cached path between here and target
                try {
                    var k = Mapper.reuseKey(
                        Mapper.toPosKey(creep.pos),
                        Mapper.toPosKey(target.pos)
                    );
                    if (!Memory.pathCache) Memory.pathCache = {};
                    Cache.del(Memory.pathCache, k);
                } catch (e) {
                    void e;
                }
            }
            // moveTo accepts RoomPosition or {pos}; ensure we pass a valid object
            var dest = target.pos ? target.pos : target;
            if (!Threat.isDanger(dest, creep.room.name)) creep.moveTo(dest, moveOpts);
        }

        Log.onChange(
            'healer.state.' + creep.room.name + '.' + creep.name,
            target.id,
            G.info(
                'Healer ' + creep.name + ' healing ' + (target.name || target.id),
                ['Keep healers behind melee; pair with guards later.'],
                {
                    file: 'role.healer.js',
                    room: creep.room.name,
                    creep: creep.name,
                    target: target.name || target.id,
                },
                'HEALER_HEAL'
            ),
            'debug'
        );
    },
};
