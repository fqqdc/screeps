import { MemoryExt, Cache } from "helper";
import { CreepHelper } from "helper/creep";

const HARVEST_ADVANCE_TIME = 15;

export const SourceHelper = {
    CalcHarvestRate(from: Creep, to: Source) {
        let C = from.carryCapacity - _.sum(from.carry); // usable capacity
        let R = from.getActiveBodyparts(WORK) * 2; // harvest rate
        let L = from.pos.findPathTo(to.pos).length - 1; //path length

        let d = (C / R) + L;
        if (d == 0) return 0;

        return C / d;
    },

    CalcExpectRate(source: Source) {
        let ticksToRegeneration = source.ticksToRegeneration;
        let energy = source.energy;
        if (ticksToRegeneration == undefined)
            ticksToRegeneration = 300;

        // 提前15回合去枯竭矿脉集结
        if (energy == 0 && ticksToRegeneration <= HARVEST_ADVANCE_TIME) {
            energy = source.energyCapacity;
            ticksToRegeneration += 300;
        }

        return source.energy / ticksToRegeneration;
    },

    CalcRoomExpectRate(room: Room): Number {
        const cache = Cache.FindCache(room);
        let sum = 0;
        for (const source of cache.sources) {
            sum += this.CalcExpectRate(source);
        }
        return sum;
    },

    CalcHarvestRoom: function (source: Source) {
        let memory = Memory as MemoryExt;
        if (!isNaN(memory.sources[source.id].max))
            return memory.sources[source.id].max;

        let countWall = 0;
        let pos = source.pos;
        for (let x = -1; x < 2; x++)
            for (let y = -1; y < 2; y++) {
                if (Game.map.getTerrainAt(pos.x + x, pos.y + y, pos.roomName) == 'wall')
                    countWall += 1;
            }

        return memory.sources[source.id].max = 9 - countWall;
    },

    FindHarvestSourceFor: function (creep: Creep, counter: { [id: string]: number }): Source {
        const posCreep = creep.pos;
        const sources = creep.room.find(FIND_SOURCES);

        let best = null;
        let bestDist: number = Number.MAX_VALUE;

        let opt = null;
        let optDist: number = Number.MAX_VALUE;
        let teamLength: number = Number.MAX_VALUE;

        const memory = Memory as MemoryExt;

        for (const i in sources) {
            const source = sources[i];
            const sourceteamlength = (counter[source.id] - memory.sources[source.id].max) / memory.sources[source.id].max;
            //console.log(source.id + ':' + counter[source.id] + '/' + memory.sources[source.id].max + ':' + sourceteamlength);
        }

        for (const i in sources) {
            const source = sources[i];
            const sourceId = source.id;
            const posSource = source.pos;
            let sourceDist = posCreep.findPathTo(posSource).length;
            if (source.energy == 0 && source.ticksToRegeneration > 15)
                sourceDist += 1000;


            let count = counter[sourceId];
            if (count == undefined)
                count = 0;
            const max = this.CalcHarvestRoom(source);

            if (max > count) {
                if (best == null) {
                    best = source;
                    bestDist = sourceDist;
                } else if (sourceDist < bestDist) {
                    best = source;
                    optDist = sourceDist;
                }
            } else if (best == null) {
                const otherTeamLength = (count - max) / max;
                if (opt == null) {
                    opt = source;
                    optDist = posCreep.findPathTo(posSource).length;
                    teamLength = otherTeamLength;
                } else if (otherTeamLength < teamLength) {
                    opt = source;
                    optDist = sourceDist;
                    teamLength = otherTeamLength;
                } else if (teamLength == otherTeamLength && sourceDist < optDist) {
                    opt = source;
                    optDist = sourceDist;
                    teamLength = otherTeamLength;
                }
            }
        }

        let result;
        if (best == null) {
            result = opt;
        } else {
            result = best;
        }

        return result as Source;
    },
}
