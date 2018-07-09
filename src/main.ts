import { ErrorMapper } from "utils/ErrorMapper";
import GameModule from "GameModule";
import TaskModule from "TaskModule";
import ActionModule from "ActionModule";
import { ClearCreepMemory, CreepMemoryExt, debug } from "helper";
import ProduceModule from "ProduceModule";
import { Task } from "Constant";

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {

    const gameModule = new GameModule();
    gameModule.Run();
    const taskModule = new TaskModule();
    taskModule.Run();
    const actionModule = new ActionModule();
    actionModule.Run();
    const produceModule = new ProduceModule();
    produceModule.Run();

    //ClearCreepMemory();


    let counter: { [key: string]: number } = {};
    for (const name in Game.creeps) {
        const creep = Game.creeps[name];
        if (creep.spawning && !creep.my) continue;

        const memory = creep.memory as CreepMemoryExt
        const task = memory.Task;

        if (counter[task] == undefined) {
            counter[task] = 1;
        } else {
            counter[task]++;
        }
    }

    let counterString = "";
    const keys = Object.keys(counter).sort();
    for (let i = 0; i < keys.length; i++) {
        const n = keys[i];
        counterString = counterString.concat(n + ':' + counter[n] + '|');
    }

    debug.dlog("counterString", counterString);
    if (Memory.debug)
        RawMemory.segments[1] = JSON.stringify(Memory);
});
