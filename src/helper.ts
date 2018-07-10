import { Task, Automatic, } from "Constant";

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
    Automatic: Automatic;
    AutoTask: Task;
    AutoTaskTarget: AutomaticTaskTarget;
    debug: boolean;
}

export interface AutomaticTaskTarget {
    TargetID?: string;
}

export interface RoomMemoryExt extends RoomMemory {
    trace: HashTable<number>;
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

export const ClearCreepMemory = function () {
    for (var name in Memory.creeps) {
        if (!Game.creeps[name]) {
            delete Memory.creeps[name];
            console.log('Clearing non-existing creep memory:', name);
        }
    }
}

