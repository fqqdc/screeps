import { MapCache } from "lodash";
import { Task, State } from "Constant";

/*
 * 扩展Memory操作 
 */
export interface MemoryExt extends Memory {
    debugMsg: { [k: string]: string };
    debug: boolean;
}
export interface CreepMemoryExt extends CreepMemory {
    Task: Task;
    TaskTargetID: string;
    debug: boolean;
}

export const ClearCreepMemory = function () {
    if (Game.time % 1000 == 0) {
        for (var name in Memory.creeps) {
            if (!Game.creeps[name]) {
                delete Memory.creeps[name];
                console.log('Clearing non-existing creep memory:', name);
            }
        }
    }
}

export const debug = {
    dlog: (keyName: string, msg: string): void => {
        const memory = Memory as MemoryExt;
        if (memory.debugMsg == undefined)
            memory.debugMsg = {};

        if (memory.debugMsg[keyName] != msg) {
            console.log(msg);
            memory.debugMsg[keyName] = msg;
        }
    }
}

export function GetGameObjects<T>(ids: IterableIterator<string>): T[] {
    const arr: T[] = [];
    for (const id of ids) {
        const obj = Game.getObjectById<T>(id);
        if (obj) arr.push(obj);
    }
    return arr;
}


