import { ErrorMapper } from "utils/ErrorMapper";
import GameModule from "GameModule";
import TaskModule from "TaskModule";
import ActionModule from "ActionModule";
import { ClearCreepMemory, Message, CreepMemoryExt } from "helper";
import ProduceModule from "ProduceModule";
import { Task } from "Constant";

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {

    //const gameModule = new GameModule();
    //gameModule.Run();
    //const taskModule = new TaskModule();
    //taskModule.Run();
    //const actionModule = new ActionModule();
    //actionModule.Run();
    //const produceModule = new ProduceModule();
    //produceModule.Run();
    let names = new Set(["aa", "bb", "aa"]);
    for (const name of names) {
        console.log(name);
    }

    ClearCreepMemory();




    let counter: { [key: number]: number } = {};
    for (const name in Game.creeps) {
        const creep = Game.creeps[name];
        if (creep.spawning) continue;
        const memory = creep.memory as CreepMemoryExt
        const target = memory.Task;

        if (counter[target] == undefined) {
            counter[target] = 1;
        } else {
            counter[target]++;
        }
    }

    let counterString = "";
    const keys = Object.keys(counter).sort();
    for (let i = 0; i < keys.length; i++) {
        const n = keys[i];
        counterString = counterString.concat(Task[parseInt(n)] + ':' + counter[parseInt(n)] + '|');
    }

    if (Memory.process.main.message != counterString) {
        Memory.process.main.message = counterString;
        console.log('[' + Game.time + '] ' + counterString);
    }
});
