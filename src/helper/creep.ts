import { CreepMemoryExt } from "helper";

export const CreepHelper = {
    GetCountForStateTarget: function () {
        var counter: { [id: string]: number } = {};
        for (const name in Game.creeps) {
            const creep = Game.creeps[name];
            const memory = creep.memory as CreepMemoryExt;
            const targetId = memory.StateTargetID;

            if (counter[targetId] == undefined) {
                counter[targetId] = 1;
            } else {
                counter[targetId]++;
            }
        }
        return counter;
    },
}
