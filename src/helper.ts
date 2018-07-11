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

export function randomInt(max: number) {
    return Math.floor((Math.random() * max * 100)) % max;
}

export function GetClosestObjectByPath<T extends _HasRoomPosition>(from: RoomPosition, arr: T[]): T {
    let best: T | undefined;
    let bestPL: Number = Number.MAX_VALUE;

    for (const obj of arr) {
        const pathLength = from.findPathTo(obj).length;
        if (best == undefined) {
            best = obj;
            bestPL = pathLength;
        } else if (pathLength < bestPL) {
            best = obj;
            bestPL = pathLength;
        }
    }

    return best as T;
}

export function GetClosestObjectByRange<T extends _HasRoomPosition>(from: RoomPosition, arr: T[]): T {
    let best: T | undefined;
    let bestPL: Number = Number.MAX_VALUE;

    for (const obj of arr) {
        const pathLength = from.getRangeTo(obj);
        if (best == undefined) {
            best = obj;
            bestPL = pathLength;
        } else if (pathLength < bestPL) {
            best = obj;
            bestPL = pathLength;
        }
    }

    return best as T;
}

