import { Task } from "Constant";
import { CreepMemoryExt, Cache, GameCache, Message, RoomTaskResult, MemoryExt, debug, } from "helper";
import { SourceHelper } from "helper/SourceHelper";
import { PositionHelper } from "helper/position";

type TaskTarget = Source | Structure | ConstructionSite | Resource;
type TaskProcess = { (room: Room, cache: TaskModuleCache): Boolean }
type BaseBuilding = StructureExtension | StructureSpawn;

export default class TaskModule {
    private cache: TaskModuleCache;

    constructor() {
        this.cache = {
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
        };

        this.InitTaskCounters();
    }

    private InitTaskCounters(): void {
        for (const name in Game.creeps) {
            const creep = Game.creeps[name];
            const creepMemory = creep.memory as CreepMemoryExt;

            const targetCounter = this.cache.TargetCounter;
            const taskCounter = this.cache.TaskCounter;

            const targetId = creepMemory.TaskTargetID;
            if (targetId != undefined) {
                if (targetCounter[targetId] == undefined) {
                    targetCounter[targetId] = 1;
                } else {
                    targetCounter[targetId] += 1;
                }
            }

            if (creepMemory.Task == undefined) {
                creepMemory.Task = Task.Idle;
            }
            const task = creepMemory.Task;
            if (taskCounter[task] == undefined) {
                taskCounter[task] = 1
            } else {
                taskCounter[task] += 1
            }
        }
    }

    private Check_ExistedTasks(room: Room): void {
        //console.log('Process_ExistedTasks:' + room.name); // DEBUG
        const roomCache = Cache.FindCache(room);
        for (const creep of roomCache.creeps) {
        }
    }

    private InitCreepArray(room: Room): void {
        const roomCache = Cache.Room[room.name];
        for (const creep of roomCache.creeps) {
            const creepMemory = creep.memory as CreepMemoryExt;
            if (creepMemory.Task == Task.Idle) {
                if (_.sum(creep.carry) == 0) this.cache.CreepsIdleEmpty.push(creep);
                else this.cache.CreepsIdleNotEmpty.push(creep);
            }
        }
    }

    private InitDroppedResources(room: Room) {
        const resources = room.find(FIND_DROPPED_RESOURCES);
        const targetCounter = this.cache.TargetCounter;
        const resourcesCounter = this.cache.ResourcesAmount;
        const roomCache = Cache.Room[room.name];

        for (const res of resources) {
            let amount = res.amount;

            if (targetCounter[res.id] == undefined) {
                this.cache.DroppedResources.push(res);
                resourcesCounter[res.id] = amount;
                continue;
            }

            for (const creep of roomCache.creeps) {
                const creepMemory = creep.memory as CreepMemoryExt;
                if (creepMemory.TaskTargetID != res.id) continue;

                const creepCarry = creep.carryCapacity - _.sum(creep.carry);
                amount -= creepCarry;
                if (amount <= 0) break;
            }

            if (amount > 0) {
                this.cache.DroppedResources.push(res);
                resourcesCounter[res.id] = amount;
            }
        }
    }

    private InitSources(room: Room) {
        const roomCache = Cache.Room[room.name];
        const targetCounter = this.cache.TargetCounter;
        const memory = Memory as MemoryExt;

        for (const source of roomCache.sources) {
            let remainingRate = SourceHelper.CalcExpectRate(source);
            let freeRoom = SourceHelper.CalcHarvestRoom(source);
            const max = memory.sources[source.id].max;
            let teamLength = (0 - freeRoom) / max;
            let hasLongTeam = false;

            if (targetCounter[source.id] == undefined) {
                this.cache.Sources.push(source);
                this.cache.SourcesData[source.id] = {
                    RemainingRate: remainingRate,
                    FreeRoom: freeRoom,
                };
                continue;
            }

            for (const creep of roomCache.creeps) {
                const creepMemory = creep.memory as CreepMemoryExt;
                if (creepMemory.TaskTargetID != source.id) continue;

                freeRoom -= 1;
                teamLength = SourceHelper.CalcTeamLength(max - freeRoom, max);
                hasLongTeam = SourceHelper.IsLongTeam(teamLength);
                if (hasLongTeam) break;

                remainingRate -= SourceHelper.CalcHarvestRate(creep, source);
                if (remainingRate <= 0) break;
            }

            if (!hasLongTeam && remainingRate > 0) {
                this.cache.Sources.push(source);
                this.cache.SourcesData[source.id] = {
                    RemainingRate: remainingRate,
                    FreeRoom: freeRoom,
                };
            }
        }
    }

    private InitBaseBuildings(room: Room) {
        const roomCache = Cache.Room[room.name];
        const targetCounter = this.cache.TargetCounter;
        const memory = Memory as MemoryExt;

        let baseBuildings: BaseBuilding[] = [];
        baseBuildings = baseBuildings.concat(roomCache.spawns);
        baseBuildings = baseBuildings.concat(roomCache.extensions);

        for (const baseBuilding of baseBuildings) {
            let freeCapacity = baseBuilding.energyCapacity - baseBuilding.energy;
            if (freeCapacity == 0) continue;

            if (targetCounter[baseBuilding.id] == undefined) {
                this.cache.BaseBuildings.push(baseBuilding);
                this.cache.BaseBuildingsCapacity[baseBuilding.id] = freeCapacity;
                continue;
            }

            for (const creep of roomCache.creeps) {
                const creepMemory = creep.memory as CreepMemoryExt;
                if (creepMemory.TaskTargetID != baseBuilding.id) continue;

                freeCapacity -= creep.carry.energy;
                if (freeCapacity <= 0) break;
            }

            if (freeCapacity > 0) {
                this.cache.BaseBuildings.push(baseBuilding);
                this.cache.BaseBuildingsCapacity[baseBuilding.id] = freeCapacity;
            }
        }
    }

    private InitTowers(room: Room) {
        const roomCache = Cache.Room[room.name];
        const targetCounter = this.cache.TargetCounter;
        const memory = Memory as MemoryExt;

        const structures = room.find(FIND_MY_STRUCTURES);
        const towers: StructureTower[] = [];
        for (const structure of structures) {
            switch (structure.structureType) {
                case STRUCTURE_TOWER:
                    towers.push(structure);
                    break;
            }
        }

        for (const tower of towers) {
            let freeCapacity = tower.energyCapacity - tower.energy;
            if (freeCapacity == 0) continue;

            if (targetCounter[tower.id] == undefined) {
                this.cache.Towers.push(tower);
                this.cache.TowersCapacity[tower.id] = freeCapacity;
                continue;
            }

            for (const creep of roomCache.creeps) {
                const creepMemory = creep.memory as CreepMemoryExt;
                if (creepMemory.TaskTargetID != tower.id) continue;

                freeCapacity -= creep.carry.energy;
                if (freeCapacity <= 0) break;
            }

            if (freeCapacity > 0) {
                this.cache.Towers.push(tower);
                this.cache.TowersCapacity[tower.id] = freeCapacity;
            }
        }
    }

    Run(msg: Message) {
        for (const roomName in Game.rooms) {
            const room = Game.rooms[roomName];
            if (!IsMyRoom(room)) continue;

            this.Check_ExistedTasks(room);

            this.InitDroppedResources(room);
            this.InitCreepArray(room);
            this.InitSources(room);

            const seq = this.GetProcessSequence();
            let process: TaskProcess | undefined;
            while (process = seq.shift()) {
                const result = process(room, this.cache);
            }
        }
    }

    // 调度任务队列
    private GetProcessSequence(): TaskProcess[] {
        let seq: TaskProcess[] = [];
        seq.push(TaskProcess_MinimumUpgradeController);
        seq.push(TaskProcess_Pickup);
        seq.push(TaskProcess_Harvest);
        seq.push(TaskProcess_FillBase);



        seq.push(Process_BestBuild);
        seq.push(Process_BestUpgradeController);
        return seq;
    }
}

interface TaskModuleCache {
    TaskCounter: HashTable;
    TargetCounter: HashTable;

    CreepsIdleEmpty: Creep[];
    CreepsIdleNotEmpty: Creep[];

    ResourcesAmount: HashTable;
    DroppedResources: Resource[];

    SourcesData: { [id: string]: SourceData };
    Sources: Source[];

    BaseBuildings: BaseBuilding[];
    BaseBuildingsCapacity: HashTable;

    Towers: StructureTower[];
    TowersCapacity: HashTable;
}

interface SourceData {
    RemainingRate: number;
    FreeRoom: number;
}

function HasNotEmptyCreep(cache: TaskModuleCache): Boolean {
    return cache.CreepsIdleNotEmpty.length > 0;
}

function NotUpgradeController(room: Room): Boolean {
    const roomCache = Cache.Room[room.name];
    for (const creep of roomCache.creeps) {
        if ((creep.memory as CreepMemoryExt).Task == Task.UpgradeController)
            return false;
    }
    return true;
}

function GetClosestObject<T extends RoomObject>(from: RoomPosition, arr: T[]): T {
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

function SetTask(creep: Creep, task: Task, target: TaskTarget, cache: TaskModuleCache) {
    const creepMemory = creep.memory as CreepMemoryExt;
    creepMemory.Task = task;
    creepMemory.TaskTargetID = target.id;

    if (cache.TargetCounter[target.id] == undefined) {
        cache.TargetCounter[target.id] = 0
    } else {
        cache.TargetCounter[target.id] += 1;
    }
}

function RemoveObject<T>(o: T, arr: T[]) {
    for (let i = 0; i < arr.length; i++) {
        if (o == arr[i]) {
            arr.splice(i, 1);
        }
    }
}

function TaskProcess_MinimumUpgradeController(room: Room, cache: TaskModuleCache): Boolean {
    if (Memory.debug) console.log('TaskProcess_MinimumUpgradeController:' + room.name); // DEBUG
    const controller = room.controller as StructureController;

    if (!HasNotEmptyCreep(cache)) return false;
    if (!NotUpgradeController(room)) return true;

    const creep = GetClosestObject(controller.pos, cache.CreepsIdleNotEmpty);
    SetTask(creep, Task.Harvest, controller, cache);
    RemoveObject(creep, cache.CreepsIdleNotEmpty);

    return true;
}

function HasEmptyCreep(cache: TaskModuleCache): Boolean {
    return cache.CreepsIdleEmpty.length > 0;
}

function HasDroppedResource(cache: TaskModuleCache): Boolean {
    return cache.DroppedResources.length > 0;
}

function TaskProcess_Pickup(room: Room, cache: TaskModuleCache): Boolean {
    if (Memory.debug) console.log('TaskProcess_Pickup:' + room.name); // DEBUG

    if (!HasEmptyCreep(cache)) return false;
    if (!HasDroppedResource(cache)) return true;

    for (const res of cache.DroppedResources) {
        if (cache.CreepsIdleEmpty.length == 0) return false;

        do {
            const creep = GetClosestCreep(res.pos, cache.CreepsIdleEmpty);
            SetTask(creep, Task.Pickup, res, cache);
            RemoveObject(creep, cache.CreepsIdleEmpty);

            const creepCarry = creep.carryCapacity;
            cache.ResourcesAmount[res.id] -= creepCarry;

        } while (cache.ResourcesAmount[res.id] > 0 && cache.CreepsIdleEmpty.length > 0)
    }

    return cache.CreepsIdleEmpty.length > 0
}

function HasHarvestRoom(cache: TaskModuleCache) {
    return cache.Sources.length > 0;
}

function TaskProcess_Harvest(room: Room, cache: TaskModuleCache): Boolean {
    if (Memory.debug) console.log('TaskProcess_Harvest:' + room.name); // DEBUG

    if (!HasEmptyCreep(cache)) return false;
    if (!HasHarvestRoom(cache)) return true;

    do {
        const creep = cache.CreepsIdleEmpty.shift() as Creep;

        //const source = SourceHelper.FindHarvestSourceFor(creep, cache.TargetCounter);
        const source = GetClosestObject(creep.pos, cache.Sources);
        SetTask(creep, Task.Harvest, source, cache);
        RemoveObject(creep, cache.CreepsIdleEmpty);

        const sourceData = cache.SourcesData[source.id];

        sourceData.FreeRoom -= 1;
        const memory = Memory as MemoryExt;
        const max = memory.sources[source.id].max;
        const teamLength = SourceHelper.CalcTeamLength(max - sourceData.FreeRoom, max);

        const hasLongTeam = SourceHelper.IsLongTeam(teamLength)
        if (!hasLongTeam) {
            sourceData.RemainingRate -= SourceHelper.CalcHarvestRate(creep, source);
            if (sourceData.RemainingRate > 0) {
                continue;
            }
        }

        RemoveObject(source, cache.Sources);
        if (cache.Sources.length == 0) return true;

    } while (cache.CreepsIdleEmpty.length > 0);

    return cache.Sources.length == 0;
}

function IsFullBase(cache: TaskModuleCache) {
    return cache.BaseBuildings.length == 0;
}

function TaskProcess_FillBase(room: Room, cache: TaskModuleCache): Boolean {
    if (Memory.debug) console.log('TaskProcess_FillBase:' + room.name); // DEBUG

    if (!HasNotEmptyCreep(cache)) return false;
    if (IsFullBase(cache)) return true;

    do {
        const creep = cache.CreepsIdleNotEmpty.shift() as Creep;
        const building = GetClosestObject(creep.pos, cache.BaseBuildings);
        SetTask(creep, Task.Transfer, building, cache);
        RemoveObject(creep, cache.CreepsIdleNotEmpty);

        cache.BaseBuildingsCapacity[building.id] -= creep.carry.energy;
        if (cache.BaseBuildingsCapacity[building.id] <= 0) {
            RemoveObject(building, cache.BaseBuildings);
            if (cache.BaseBuildings.length == 0) break;
        }

    } while (cache.CreepsIdleNotEmpty.length > 0);

    return cache.CreepsIdleNotEmpty.length > 0;
}

function HasNotFullTower(cache: TaskModuleCache): Boolean {
    return cache.Towers.length > 0;
}

function TaskProcess_FillTower(room: Room, cache: TaskModuleCache): Boolean {
    if (Memory.debug) console.log('TaskProcess_FillTower:' + room.name); // DEBUG

    if (!HasNotEmptyCreep(cache)) return false;
    if (!HasNotFullTower(cache)) return true;

    do {
        const creep = cache.CreepsIdleNotEmpty.shift() as Creep;
        const tower = GetClosestObject(creep.pos, cache.Towers);
        SetTask(creep, Task.Transfer, tower, cache);
        RemoveObject(creep, cache.CreepsIdleNotEmpty);

        cache.TowersCapacity[tower.id] -= creep.carry.energy;
        if (cache.TowersCapacity[tower.id] <= 0) {
            RemoveObject(tower, cache.Towers);
            if (cache.Towers.length == 0) break;
        }

    } while (cache.CreepsIdleNotEmpty.length > 0);

    return cache.CreepsIdleNotEmpty.length > 0;
}

function Process_BestBuild(room: Room, cache: Cache): boolean {
    //console.log('Process_BestBuild:' + room.name); // DEBUG
    const structures = room.find(FIND_MY_CONSTRUCTION_SITES);
    if (structures.length == 0) {
        console.log("Process_BestBuild no structure:" + true); // DEBUG
        return true;
    }

    let creep = GetIdleCreepInRoom(room) as Creep;
    while (creep) {
        const structure = PositionHelper.GetClosestObject(creep.pos, structures) as ConstructionSite;
        const task = CreateCreepTask(creep, cache, Task.Build, structure);
        task.Run();

        creep = GetIdleCreepInRoom(room) as Creep;
    };

    if (creep == null && CountTaskCreep(room, Task.Build) < 1) {
        console.log('Process_BestBuild Builder < 1:' + room.name + " " + false); // DEBUG
        return false;
    }

    console.log('Process_BestBuild:' + room.name + " " + true); // DEBUG
    return true;
}

function Process_BestUpgradeController(room: Room, cache: Cache): boolean {
    //console.log('Process_BestUpgradeController:' + room.name); // DEBUG
    if (HasNotFullContainer(room)) {
        console.log('Process_BestUpgradeController HasNotFullContainer:' + true); // DEBUG
        return true;
    }

    const roomCache = Cache.FindCache(room);
    let expectRate = 0;

    for (const source of roomCache.sources) {
        expectRate += SourceHelper.CalcExpectRate(source);
    }

    let upgradeRate = 0;
    for (const creep of roomCache.creeps) {
        const memory = creep.memory as CreepMemoryExt;
        if (memory.Task != Task.UpgradeController) continue;
        upgradeRate += creep.getActiveBodyparts(WORK);
    }

    let creep = GetIdleCreepInRoom(room);
    let result = upgradeRate > expectRate;
    const target = room.controller as StructureController;
    while (!result && creep != null) {
        const task = CreateCreepTask(creep, cache, Task.UpgradeController, target);
        task.Run();
        upgradeRate += creep.getActiveBodyparts(WORK);

        creep = GetIdleCreepInRoom(room);
        result = upgradeRate >= expectRate;
    }

    console.log('Process_BestUpgradeController:' + result); // DEBUG
    return result;
}

function GetClosestIdleCreep(from: TaskTarget): Creep | null {
    const creeps: Creep[] = [];
    for (const name in Game.creeps) {
        const creep = Game.creeps[name];
        if (creep.spawning) continue;
        let memory = creep.memory as CreepMemoryExt;
        if (memory.Task == undefined || memory.State == State.Idle)
            creeps.push(creep);
    }
    return PositionHelper.GetClosestObject(from.pos, creeps) as Creep | null;
}

function GetIdleCreepInRoom(room: Room): Creep | null {
    const cache = Cache.FindCache(room);
    const creeps: Creep[] = [];
    for (const creep of cache.creeps) {
        if (creep.spawning) continue;

        const memory = creep.memory as CreepMemoryExt;
        if (memory.Task == undefined || memory.State == State.Idle)
            return creep;
    }
    return null;
}

function CreateCreepTask(creep: Creep, stateTargetCounter: Cache, task: Task, tasktarget: TaskTarget): BaseCreepTask {
    const memory = creep.memory as CreepMemoryExt;
    const obj = BaseCreateCreepTask(creep, stateTargetCounter, task);
    obj.ClearTask();

    obj.Task = task;
    obj.TaskTarget = tasktarget;
    return obj;
}



function SetCreepTask(task: Task, target: TaskTarget) {

}

function IsMyRoom(room: Room) {
    return room.controller != null && room.controller.my;
}

function IsTargetFull(target: AnyStructure): boolean {
    switch (target.structureType) {
        case STRUCTURE_SPAWN:
        case STRUCTURE_EXTENSION:
        case STRUCTURE_TOWER:
            return target.energy == target.energyCapacity;
        case STRUCTURE_CONTAINER:
        case STRUCTURE_STORAGE:
            return _.sum(target.store) == target.storeCapacity;
    }
    return true;
}

function IsCreepEmpty(creep: Creep): boolean {
    return _.sum(creep.carry) == 0;
}

function GetClosestNotFullContainer(creep: Creep): Structure | null {
    return PositionHelper.GetClosestNotFullContainer(creep.pos);
}

function HasNotFullContainer(room: Room): boolean {
    const structures = room.find(FIND_STRUCTURES);

    for (const structure of structures) {
        switch (structure.structureType) {
            case STRUCTURE_SPAWN:
            case STRUCTURE_EXTENSION:
            case STRUCTURE_TOWER:
                if (structure.energy < structure.energyCapacity)
                    return true;
                break;
            case STRUCTURE_CONTAINER:
            case STRUCTURE_STORAGE:
                if (_.sum(structure.store) < structure.storeCapacity)
                    return true;
        }
    }
    return false;
}

function GetClosestNotEmptyContainer(creep: Creep): Structure | null {
    const arrContainerStorage = [];
    const structures = creep.room.find(FIND_STRUCTURES);
    for (const structure of structures) {
        switch (structure.structureType) {
            case STRUCTURE_CONTAINER:
            case STRUCTURE_STORAGE:
                if (structure.store.energy == 0)
                    continue;
                arrContainerStorage.push(structure); break;
        }
    }
    let obj = PositionHelper.GetClosestObject(creep.pos, arrContainerStorage);
    if (obj) return obj as Structure;
    else return null
}

function RequestHarvestSource(creep: Creep, counter: Cache): Source {
    return SourceHelper.FindHarvestSourceFor(creep, counter);
}

function GetClosestConstructionSite(creep: Creep): ConstructionSite | null {
    const structures = creep.room.find(FIND_MY_CONSTRUCTION_SITES);
    let obj = PositionHelper.GetClosestObject(creep.pos, structures);
    if (obj) return obj as ConstructionSite;
    else return null
}

function IsConstructionSite(structure: Structure): boolean {
    return structure instanceof ConstructionSite;
}
