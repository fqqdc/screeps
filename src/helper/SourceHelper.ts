import { MemoryExt } from "helper";

const HARVEST_ADVANCE_TIME = 15;

export const SourceHelper = {
    CalcHarvestRate(creep: Creep | null) {
        if (creep != null) {
            return creep.getActiveBodyparts(WORK) * 2;
        } else { return 0; }
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

    CalcEnergy(source: Source) {
        let ticksToRegeneration = source.ticksToRegeneration;
        let energy = source.energy;
        if (ticksToRegeneration == undefined)
            ticksToRegeneration = 300;

        if (ticksToRegeneration <= HARVEST_ADVANCE_TIME) {
            energy += source.energyCapacity;
        }

        return energy;
    },

    CalcMaxHarvestRoom: function (source: Source) {
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

    IsSourceEmpty: function (source: Source): boolean {
        return source.energy == 0 && source.ticksToRegeneration > HARVEST_ADVANCE_TIME;
    },
}
