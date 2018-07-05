import { MapCache } from "lodash";
import { Task, State } from "Constant"; 

/*
 * 扩展Memory操作 
 */
export interface MemoryExt extends Memory {
    sources: { [id: string]: SourceMemory };
    debugMsg: { [k: string]: string };
    debug: boolean;
}
export interface CreepMemoryExt extends CreepMemory {
    Task: Task;
    TaskTargetID: string;
    debug: boolean;
}
export interface SourceMemory {
    max: number;
}



export class RoomCache {
    room: Room;
    sources: Source[];
    creeps: Creep[];    
    spawns: StructureSpawn[];
    extensions: StructureExtension[];
    constructor(room: Room) {
        this.room = room;
        this.sources = [];
        this.creeps = [];
        this.creepsIdleEmpty = [];
        this.creepsIdleNotEmpty = [];
        this.spawns = [];
        this.extensions = [];
    }
}

export class GameCache {
    [name: string]: any;
    rooms: RoomCache[];
    Room: { [name: string]: RoomCache };
    constructor() {
        this.rooms = [];
        this.Room = {};
    }

    FindCache(room: Room): RoomCache {
        let index = _.findIndex(Cache.rooms, c => c.room == room);
        return Cache.rooms[index];
    }
}

export let Cache = new GameCache();

export interface Message {
    roomTaskResults: RoomTaskResult[];
}

export interface RoomTaskResult {
    room: Room;
    needMoreWorker: boolean;
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
