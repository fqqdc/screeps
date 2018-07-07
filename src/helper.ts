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

    Data: _RoomData;

    constructor(room: Room) {
        this.room = room;
        this.sources = [];
        this.creeps = [];
        this.spawns = [];
        this.extensions = [];

        this.Data = {
            TargetCounter: {},
            TaskCounter: {},

            CreepsIdleEmpty: [],
            CreepsIdleNotEmpty: [],

            ResourcesAmount: {},
            DroppedResources: [],

            SourcesData: {},
            Sources: [],

            BaseBuildings: [],
            BaseBuildingsCapacity: {},

            Towers: [],
            TowersCapacity: {},

            ConstructionSites: [],

            BrokenStructures: [],
            BrokenStructuresDamaged: {},

            NotEmptyStores: [],
            NotEmptyStoresEnergy: {},

            NotFullStores: [],
            NotFullStoresCapacity: {},
        };
    }
}

export interface _RoomData {
    TaskCounter: HashTable;
    TargetCounter: HashTable;

    CreepsIdleEmpty: Creep[];
    CreepsIdleNotEmpty: Creep[];

    ResourcesAmount: HashTable;
    DroppedResources: Resource[];

    SourcesData: { [id: string]: SourceData };
    Sources: Source[];

    BaseBuildings: StructureSpawnRelated[];
    BaseBuildingsCapacity: HashTable;

    Towers: StructureTower[];
    TowersCapacity: HashTable;

    ConstructionSites: ConstructionSite[];

    BrokenStructures: Structure[];
    BrokenStructuresDamaged: HashTable;

    NotEmptyStores: StructureStorehouse[];
    NotEmptyStoresEnergy: HashTable;

    NotFullStores: StructureStorehouse[];
    NotFullStoresCapacity: HashTable;
}

export interface SourceData {
    RemainingRate: number;
    FreeRoom: number;
}

export class _GameCache {
    [name: string]: any;
    rooms: RoomCache[];
    Room: { [name: string]: RoomCache };

    constructor() {
        this.rooms = [];
        this.Room = {};
    }

    FindCache(room: Room): RoomCache {
        let index = _.findIndex(GameCache.rooms, c => c.room == room);
        return GameCache.rooms[index];
    }
}

export class _CacheConfig{
    Initialized:Boolean = false;
}

export let CacheConfig = new _CacheConfig();
export let GameCache = new _GameCache();

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

export function GetGameObjects<T>(ids: string[]): T[] {
    const arr: T[] = [];
    for (const id of ids) {
        const obj = Game.getObjectById<T>(id);
        if (obj != null)
            arr.push(obj);
    }
    return arr;
}
