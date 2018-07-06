import { Task } from "Constant";
import { CreepMemoryExt, Cache, GameCache, Message, RoomTaskResult, MemoryExt, debug, } from "helper";
import { SourceHelper } from "helper/SourceHelper";
import { PositionHelper } from "helper/position";
import { CreepHelper } from "helper/CreepHelper";
import { SiteHelper } from "helper/SiteHelper";
import { StructureHelper } from "helper/StructureHelper";

type TaskTarget = Source | Structure | ConstructionSite | Resource | StructureStore;
type TaskProcess = { (room: Room, cache: TaskModuleCache): Boolean }
type BaseBuilding = StructureExtension | StructureSpawn;
type StructureStore = StructureContainer | StructureStorage;

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

            ConstructionSites: [],

            BrokenStructures: [],
            BrokenStructuresDamaged: {},

            NotEmptyStores: [],
            NotEmptyStoresEnergy: {},

            NotFullStores: [],
            NotFullStoresCapacity: {},
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
            const creepMemory = creep.memory as CreepMemoryExt;
            switch (creepMemory.Task) {
                case Task.Build:
                    Check_BuildTask(creep, this.cache); break;
                case Task.Harvest:
                    Check_HarvestTask(creep, this.cache); break;
                case Task.Pickup:
                    Check_PickupTask(creep, this.cache); break;
                case Task.Repair:
                    Check_RepairTask(creep, this.cache); break;
                case Task.Transfer:
                    Check_TransferTask(creep, this.cache); break;
                case Task.UpgradeController:
                    Check_UpgradeControllerTask(creep, this.cache); break;
                case Task.Withdraw:
                    Check_WithdrawTask(creep, this.cache); break;
            }
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

    private InitConstructionSites(room: Room) {
        this.cache.ConstructionSites = room.find(FIND_MY_CONSTRUCTION_SITES);
    }

    private InitBrokenStructures(room: Room) {
        const targetCounter = this.cache.TargetCounter;
        const structures = room.find(FIND_STRUCTURES)
        const roomCache = Cache.Room[room.name];

        for (const structure of structures) {
            let damaged = structure.hitsMax - structure.hits;
            if (damaged == 0) continue;

            if (targetCounter[structure.id] == undefined) {
                this.cache.BrokenStructures.push(structure);
                this.cache.BrokenStructuresDamaged[structure.id] = damaged;
                continue;
            }

            for (const creep of roomCache.creeps) {
                const creepMemory = creep.memory as CreepMemoryExt;
                if (creepMemory.TaskTargetID != structure.id) continue;

                damaged -= creep.carry.energy * 100
                if (damaged <= 0) break;
            }

            if (damaged > 0) {
                this.cache.BrokenStructures.push(structure);
                this.cache.BrokenStructuresDamaged[structure.id] = damaged;
            }
        }

    }

    private InitStores(room: Room) {
        const targetCounter = this.cache.TargetCounter;
        const roomCache = Cache.Room[room.name];

        const structures = room.find(FIND_STRUCTURES)
        const noFullStores: StructureStore[] = [];
        const noEmptyStores: StructureStore[] = [];
        for (const structure of structures) {
            switch (structure.structureType) {
                case STRUCTURE_STORAGE:
                case STRUCTURE_CONTAINER:
                    if (structure.storeCapacity - _.sum(structure.store) > 0)
                        noFullStores.push(structure);
                    if (structure.store.energy > 0)
                        noEmptyStores.push(structure);
                    break;
            }
        }

        for (const store of noFullStores) {
            let freeCapacity = store.storeCapacity - _.sum(store.store);

            if (targetCounter[store.id] == undefined) {
                this.cache.NotFullStores.push(store);
                this.cache.NotFullStoresCapacity[store.id] = freeCapacity;
                continue;
            }

            for (const creep of roomCache.creeps) {
                const creepMemory = creep.memory as CreepMemoryExt;
                if (creepMemory.TaskTargetID != store.id) continue;

                freeCapacity -= _.sum(creep.carry);
                if (freeCapacity <= 0) break;
            }

            if (freeCapacity > 0) {
                this.cache.NotFullStores.push(store);
                this.cache.NotFullStoresCapacity[store.id] = freeCapacity;
            }
        }

        for (const store of noFullStores) {
            let energy = store.store.energy;

            if (targetCounter[store.id] == undefined) {
                this.cache.NotEmptyStores.push(store);
                this.cache.NotEmptyStoresEnergy[store.id] = energy;
                continue;
            }

            for (const creep of roomCache.creeps) {
                const creepMemory = creep.memory as CreepMemoryExt;
                if (creepMemory.TaskTargetID != store.id) continue;

                energy -= creep.carryCapacity;
                if (energy <= 0) break;
            }

            if (energy > 0) {
                this.cache.NotEmptyStores.push(store);
                this.cache.NotEmptyStoresEnergy[store.id] = energy;
            }
        }

    }

    Run(msg: Message) {
        for (const roomName in Game.rooms) {
            const room = Game.rooms[roomName];
            if (room.controller == null || !room.controller.my) continue;

            this.Check_ExistedTasks(room);

            this.InitDroppedResources(room);
            this.InitCreepArray(room);
            this.InitSources(room);
            this.InitBaseBuildings(room)
            this.InitTowers(room);
            this.InitConstructionSites(room);
            this.InitBrokenStructures(room);
            this.InitStores(room);

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
        seq.push(TaskProcess_MinimumUpgradeController); //1
        seq.push(TaskProcess_Pickup); //2
        seq.push(TaskProcess_Harvest); //3
        seq.push(TaskProcess_FillBase); //4
        seq.push(TaskProcess_FillTower); //5
        seq.push(TaskProcess_WithdrawEnergy); //6
        seq.push(TaskProcess_Build); //7
        seq.push(TaskProcess_Repair); //8
        seq.push(TaskProcess_FillStore); //9
        seq.push(TaskProcess_UpgradeController); //10

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

    ConstructionSites: ConstructionSite[];

    BrokenStructures: Structure[];
    BrokenStructuresDamaged: HashTable;

    NotEmptyStores: StructureStore[];
    NotEmptyStoresEnergy: HashTable;

    NotFullStores: StructureStore[];
    NotFullStoresCapacity: HashTable;
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
    if (task == Task.Idle) throw "不能设置 Task.Idle 任务";
    const creepMemory = creep.memory as CreepMemoryExt;

    const oldTargetID = creepMemory.TaskTargetID;
    if (cache.TargetCounter[oldTargetID] == undefined
        || cache.TargetCounter[oldTargetID] < 1) throw "TargetCounter 未知的计数错误";
    cache.TargetCounter[oldTargetID] -= 1;

    creepMemory.Task = task;
    creepMemory.TaskTargetID = target.id;

    if (cache.TargetCounter[target.id] == undefined) {
        cache.TargetCounter[target.id] = 0
    } else {
        cache.TargetCounter[target.id] += 1;
    }
}

function SetIdleTask(creep: Creep, cache: TaskModuleCache) {
    const creepMemory = creep.memory as CreepMemoryExt;
    const oldTargetID = creepMemory.TaskTargetID;
    if (cache.TargetCounter[oldTargetID] == undefined
        || cache.TargetCounter[oldTargetID] < 1) throw "TargetCounter 未知的计数错误";
    cache.TargetCounter[oldTargetID] -= 1;

    creepMemory.Task = Task.Idle;
    delete creepMemory.TaskTargetID;
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

    if (!HasNotEmptyCreep(cache)) return false;
    if (!NotUpgradeController(room)) return true;

    const controller = room.controller as StructureController;
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
            const creep = GetClosestObject(res.pos, cache.CreepsIdleEmpty);
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

function HasConstructionSite(cache: TaskModuleCache): Boolean {
    return cache.ConstructionSites.length > 0;
}

function HasBrokenStructure(cache: TaskModuleCache): Boolean {
    return cache.BrokenStructures.length > 0;
}

function TaskProcess_WithdrawEnergy(room: Room, cache: TaskModuleCache): Boolean {
    if (Memory.debug) console.log('TaskProcess_WithdrawEnergy:' + room.name); // DEBUG

    if (!HasEmptyCreep(cache)) return false;
    if (!HasConstructionSite(cache)) return true;
    if (!HasBrokenStructure(cache)) return true;
    if (!HasNotEmptyStore(cache)) return true;

    do {
        const creep = cache.CreepsIdleEmpty.shift() as Creep;
        const store = GetClosestObject(creep.pos, cache.NotEmptyStores);
        SetTask(creep, Task.Withdraw, store, cache);
        RemoveObject(creep, cache.CreepsIdleEmpty);

        cache.NotEmptyStoresEnergy[store.id] -= creep.carryCapacity;
        if (cache.NotEmptyStoresEnergy[store.id] <= 0) {
            RemoveObject(store, cache.NotEmptyStores);
            if (cache.NotEmptyStores.length == 0) break;
        }

    } while (cache.NotEmptyStores.length > 0);

    return cache.NotEmptyStores.length > 0;
}

function TaskProcess_Build(room: Room, cache: TaskModuleCache): Boolean {
    if (Memory.debug) console.log('TaskProcess_Build:' + room.name); // DEBUG

    if (!HasNotEmptyCreep(cache)) return false;
    if (!HasConstructionSite(cache)) return true;

    do {
        const creep = cache.CreepsIdleNotEmpty.shift() as Creep;
        const site = GetClosestObject(creep.pos, cache.ConstructionSites);
        SetTask(creep, Task.Build, site, cache);
        RemoveObject(creep, cache.CreepsIdleNotEmpty);

    } while (cache.CreepsIdleNotEmpty.length > 0)

    return cache.CreepsIdleNotEmpty.length > 0;
}

function TaskProcess_Repair(room: Room, cache: TaskModuleCache): Boolean {
    if (Memory.debug) console.log('TaskProcess_Repair:' + room.name); // DEBUG

    if (!HasNotEmptyCreep(cache)) return false;
    if (!HasBrokenStructure(cache)) return true;

    do {
        const creep = cache.CreepsIdleNotEmpty.shift() as Creep;
        const broken = GetClosestObject(creep.pos, cache.BrokenStructures);
        SetTask(creep, Task.Repair, broken, cache);
        RemoveObject(creep, cache.CreepsIdleNotEmpty);

        cache.BrokenStructuresDamaged[broken.id] -= creep.carry.energy * 100;
        if (cache.NotEmptyStoresEnergy[broken.id] <= 0) {
            RemoveObject(broken, cache.BrokenStructures);
            if (cache.BrokenStructures.length == 0) break;
        }

    } while (cache.CreepsIdleNotEmpty.length > 0)

    return cache.CreepsIdleNotEmpty.length > 0;
}

function HasNotEmptyStore(cache: TaskModuleCache): Boolean {
    return cache.NotEmptyStores.length > 0;
}

function TaskProcess_FillStore(room: Room, cache: TaskModuleCache): Boolean {
    if (Memory.debug) console.log('TaskProcess_FillStore:' + room.name); // DEBUG

    if (!HasNotEmptyCreep(cache)) return false;
    if (!HasNotEmptyStore(cache)) return true;

    do {
        const creep = cache.CreepsIdleNotEmpty.shift() as Creep;
        const store = GetClosestObject(creep.pos, cache.NotEmptyStores);
        SetTask(creep, Task.Transfer, store, cache);
        RemoveObject(creep, cache.CreepsIdleNotEmpty);

        cache.NotEmptyStoresEnergy[store.id] -= _.sum(creep.carry);
        if (cache.NotEmptyStoresEnergy[store.id] <= 0) {
            RemoveObject(store, cache.NotEmptyStores);
            if (cache.NotEmptyStores.length == 0) break;
        }

    } while (cache.CreepsIdleNotEmpty.length > 0)

    return cache.CreepsIdleNotEmpty.length > 0;
}

function TaskProcess_UpgradeController(room: Room, cache: TaskModuleCache): Boolean {
    if (Memory.debug) console.log('TaskProcess_UpgradeController:' + room.name); // DEBUG

    if (!HasNotEmptyCreep(cache)) return false;

    const controller = room.controller as StructureController;
    do {
        const creep = cache.CreepsIdleNotEmpty.shift() as Creep;
        SetTask(creep, Task.UpgradeController, controller, cache);
        RemoveObject(creep, cache.CreepsIdleNotEmpty);

    } while (cache.CreepsIdleNotEmpty.length > 0)

    return false;
}

function Check_BuildTask(creep: Creep, cache: TaskModuleCache) {
    const creepMemory = creep.memory as CreepMemoryExt;
    const structure = Game.getObjectById(creepMemory.TaskTargetID) as Structure;
    if (structure == null
        || CreepHelper.IsCreepEmpty(creep)
        || SiteHelper.IsConstructionSite(structure)) {
        SetIdleTask(creep, cache);
    }
}

function Check_HarvestTask(creep: Creep, cache: TaskModuleCache) {
    const creepMemory = creep.memory as CreepMemoryExt;
    const source = Game.getObjectById(creepMemory.TaskTargetID) as Source;
    if (CreepHelper.IsCreepFull(creep)
        || SourceHelper.IsSourceEmpty(source)) {
        SetIdleTask(creep, cache);
    }
}

function Check_PickupTask(creep: Creep, cache: TaskModuleCache) {
    const creepMemory = creep.memory as CreepMemoryExt;
    const resource = Game.getObjectById(creepMemory.TaskTargetID) as Resource;

    if (resource == null || CreepHelper.IsCreepFull(creep)) {
        SetIdleTask(creep, cache);
    }
}

function Check_RepairTask(creep: Creep, cache: TaskModuleCache) {
    const creepMemory = creep.memory as CreepMemoryExt;
    const structure = Game.getObjectById(creepMemory.TaskTargetID) as Structure;

    if (structure == null
        || CreepHelper.IsCreepEmpty(creep)
        || structure.hits == structure.hitsMax) {
        SetIdleTask(creep, cache);
    }
}

function Check_TransferTask(creep: Creep, cache: TaskModuleCache) {
    const creepMemory = creep.memory as CreepMemoryExt;
    const structure = Game.getObjectById(creepMemory.TaskTargetID) as Structure;

    if (structure == null
        || CreepHelper.IsCreepEmpty(creep)
        || StructureHelper.IsFullStructure(structure)) {
        SetIdleTask(creep, cache);
    }
}

function Check_UpgradeControllerTask(creep: Creep, cache: TaskModuleCache) {
    const creepMemory = creep.memory as CreepMemoryExt;

    if (CreepHelper.IsCreepEmpty(creep)) {
        SetIdleTask(creep, cache);
    }
}

function Check_WithdrawTask(creep: Creep, cache: TaskModuleCache) {
    const creepMemory = creep.memory as CreepMemoryExt;
    const structure = Game.getObjectById(creepMemory.TaskTargetID) as Structure;

    if (structure == null
        || CreepHelper.IsCreepEmpty(creep)
        || StructureHelper.IsEmptyStructure(structure)) {
        SetIdleTask(creep, cache);
    }
}
