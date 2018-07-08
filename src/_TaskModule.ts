import { Task } from "Constant";
import { CreepMemoryExt, GameCache, Message, RoomTaskResult, MemoryExt, debug, _RoomData, } from "helper";
import { SourceHelper } from "helper/SourceHelper";
import { PositionHelper } from "helper/PositionHelper";
import { CreepHelper } from "helper/CreepHelper";
import { SiteHelper } from "helper/SiteHelper";
import { StructureHelper } from "helper/StructureHelper";

type TaskTarget = Source | Structure | ConstructionSite | Resource | StructureStorehouse;
type TaskProcess = { (room: Room): Boolean }


export default class _TaskModule {
    constructor() {
    }

    private InitTaskCounters(room: Room): void {
        const roomCache = GameCache.Room[room.name];
        const cacheData = roomCache.Data;
        const targetCounter = cacheData.TargetCounter;
        const taskCounter = cacheData.TaskCounter;

        for (const creep of roomCache.creeps) {
            const creepMemory = creep.memory as CreepMemoryExt;

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

    private InitCreepArray(room: Room): void {
        const roomCache = GameCache.Room[room.name];
        const cacheData = roomCache.Data;
        for (const creep of roomCache.creeps) {
            const creepMemory = creep.memory as CreepMemoryExt;
            if (creepMemory.Task == Task.Idle) {
                if (_.sum(creep.carry) == 0) cacheData.CreepsIdleEmpty.push(creep);
                else cacheData.CreepsIdleNotEmpty.push(creep);
            }
        }
    }

    private InitDroppedResources(room: Room) {
        const roomCache = GameCache.Room[room.name];
        const cacheData = roomCache.Data;
        const resources = room.find(FIND_DROPPED_RESOURCES);
        const targetCounter = cacheData.TargetCounter;
        const resourcesCounter = cacheData.ResourcesAmount;


        for (const res of resources) {
            let amount = res.amount;

            if (targetCounter[res.id] == undefined) {
                cacheData.DroppedResources.push(res);
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
                cacheData.DroppedResources.push(res);
                resourcesCounter[res.id] = amount;
            }
        }
    }

    private InitSources(room: Room) {
        const roomCache = GameCache.Room[room.name];
        const cacheData = roomCache.Data;
        const targetCounter = cacheData.TargetCounter;
        const memory = Memory as MemoryExt;

        for (const source of roomCache.sources) {
            let remainingRate = SourceHelper.CalcExpectRate(source);
            let freeRoom = SourceHelper.CalcMaxHarvestRoom(source);
            const max = memory.sources[source.id].max;
            let teamLength = (0 - freeRoom) / max;
            let hasLongTeam = false;

            if (targetCounter[source.id] == undefined) {
                cacheData.Sources.push(source);
                cacheData.SourcesData[source.id] = {
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

                //remainingRate -= SourceHelper.CalcHarvestRate(creep, source);
                if (remainingRate <= 0) break;
            }

            if (!hasLongTeam && remainingRate > 0) {
                cacheData.Sources.push(source);
                cacheData.SourcesData[source.id] = {
                    RemainingRate: remainingRate,
                    FreeRoom: freeRoom,
                };
            }
        }
    }

    private InitBaseBuildings(room: Room) {
        const roomCache = GameCache.Room[room.name];
        const cacheData = roomCache.Data;
        const targetCounter = cacheData.TargetCounter;
        const memory = Memory as MemoryExt;

        let baseBuildings: StructureSpawnRelated[] = [];
        baseBuildings = baseBuildings.concat(roomCache.spawns);
        baseBuildings = baseBuildings.concat(roomCache.extensions);

        for (const baseBuilding of baseBuildings) {
            let freeCapacity = baseBuilding.energyCapacity - baseBuilding.energy;
            if (freeCapacity == 0) continue;

            if (targetCounter[baseBuilding.id] == undefined) {
                cacheData.BaseBuildings.push(baseBuilding);
                cacheData.BaseBuildingsCapacity[baseBuilding.id] = freeCapacity;
                continue;
            }

            for (const creep of roomCache.creeps) {
                const creepMemory = creep.memory as CreepMemoryExt;
                if (creepMemory.TaskTargetID != baseBuilding.id) continue;

                freeCapacity -= creep.carry.energy;
                if (freeCapacity <= 0) break;
            }

            if (freeCapacity > 0) {
                cacheData.BaseBuildings.push(baseBuilding);
                cacheData.BaseBuildingsCapacity[baseBuilding.id] = freeCapacity;
            }
        }
    }

    private InitTowers(room: Room) {
        const roomCache = GameCache.Room[room.name];
        const cacheData = roomCache.Data;
        const targetCounter = cacheData.TargetCounter;

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
                cacheData.Towers.push(tower);
                cacheData.TowersCapacity[tower.id] = freeCapacity;
                continue;
            }

            for (const creep of roomCache.creeps) {
                const creepMemory = creep.memory as CreepMemoryExt;
                if (creepMemory.TaskTargetID != tower.id) continue;

                freeCapacity -= creep.carry.energy;
                if (freeCapacity <= 0) break;
            }

            if (freeCapacity > 0) {
                cacheData.Towers.push(tower);
                cacheData.TowersCapacity[tower.id] = freeCapacity;
            }
        }
    }

    private InitConstructionSites(room: Room) {
        const roomCache = GameCache.Room[room.name];
        const cacheData = roomCache.Data;
        cacheData.ConstructionSites = room.find(FIND_MY_CONSTRUCTION_SITES);
    }

    private InitBrokenStructures(room: Room) {
        const roomCache = GameCache.Room[room.name];
        const cacheData = roomCache.Data;
        const targetCounter = cacheData.TargetCounter;
        const structures = room.find(FIND_STRUCTURES)

        for (const structure of structures) {
            let damaged = structure.hitsMax - structure.hits;
            if (damaged == 0) continue;

            if (targetCounter[structure.id] == undefined) {
                cacheData.BrokenStructures.push(structure);
                cacheData.BrokenStructuresDamaged[structure.id] = damaged;
                continue;
            }

            for (const creep of roomCache.creeps) {
                const creepMemory = creep.memory as CreepMemoryExt;
                if (creepMemory.TaskTargetID != structure.id) continue;

                damaged -= creep.carry.energy * 100
                if (damaged <= 0) break;
            }

            if (damaged > 0) {
                cacheData.BrokenStructures.push(structure);
                cacheData.BrokenStructuresDamaged[structure.id] = damaged;
            }
        }

    }

    private InitStores(room: Room) {
        const roomCache = GameCache.Room[room.name];
        const cacheData = roomCache.Data;
        const targetCounter = cacheData.TargetCounter;

        const structures = room.find(FIND_STRUCTURES)
        const noFullStores: StructureStorehouse[] = [];
        const noEmptyStores: StructureStorehouse[] = [];
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
                cacheData.NotFullStores.push(store);
                cacheData.NotFullStoresCapacity[store.id] = freeCapacity;
                continue;
            }

            for (const creep of roomCache.creeps) {
                const creepMemory = creep.memory as CreepMemoryExt;
                if (creepMemory.TaskTargetID != store.id) continue;

                freeCapacity -= _.sum(creep.carry);
                if (freeCapacity <= 0) break;
            }

            if (freeCapacity > 0) {
                cacheData.NotFullStores.push(store);
                cacheData.NotFullStoresCapacity[store.id] = freeCapacity;
            }
        }

        for (const store of noFullStores) {
            let energy = store.store.energy;

            if (targetCounter[store.id] == undefined) {
                cacheData.NotEmptyStores.push(store);
                cacheData.NotEmptyStoresEnergy[store.id] = energy;
                continue;
            }

            for (const creep of roomCache.creeps) {
                const creepMemory = creep.memory as CreepMemoryExt;
                if (creepMemory.TaskTargetID != store.id) continue;

                energy -= creep.carryCapacity;
                if (energy <= 0) break;
            }

            if (energy > 0) {
                cacheData.NotEmptyStores.push(store);
                cacheData.NotEmptyStoresEnergy[store.id] = energy;
            }
        }

    }

    private Check_ExistedTasks(room: Room): void {
        //console.log('Process_ExistedTasks:' + room.name); // DEBUG
        const roomCache = GameCache.Room[room.name];
        const cacheData = roomCache.Data;

        for (const creep of roomCache.creeps) {
            const creepMemory = creep.memory as CreepMemoryExt;
            switch (creepMemory.Task) {
                case Task.Build:
                    Check_BuildTask(creep, cacheData); break;
                case Task.Harvest:
                    Check_HarvestTask(creep, cacheData); break;
                case Task.Pickup:
                    Check_PickupTask(creep, cacheData); break;
                case Task.Repair:
                    Check_RepairTask(creep, cacheData); break;
                case Task.Transfer:
                    Check_TransferTask(creep, cacheData); break;
                case Task.UpgradeController:
                    Check_UpgradeControllerTask(creep, cacheData); break;
                case Task.Withdraw:
                    Check_WithdrawTask(creep, cacheData); break;
            }
        }
    }

    Run(msg: Message) {
        for (const roomName in Game.rooms) {
            const room = Game.rooms[roomName];
            if (room.controller == null || !room.controller.my) continue;

            this.InitDroppedResources(room);
            this.InitCreepArray(room);
            this.InitSources(room);
            this.InitBaseBuildings(room)
            this.InitTowers(room);
            this.InitConstructionSites(room);
            this.InitBrokenStructures(room);
            this.InitStores(room);

            this.Check_ExistedTasks(room);

            const seq = this.GetProcessSequence();
            let process: TaskProcess | undefined;
            while (process = seq.shift()) {
                const result = process(room);
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



function HasNotEmptyCreep(cache: _RoomData): Boolean {
    return cache.CreepsIdleNotEmpty.length > 0;
}

function NotUpgradeController(room: Room): Boolean {
    const roomCache = GameCache.Room[room.name];
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

function SetTask(creep: Creep, task: Task, target: TaskTarget, cache: _RoomData) {
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

function SetIdleTask(creep: Creep, cache: _RoomData) {
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

function TaskProcess_MinimumUpgradeController(room: Room): Boolean {
    if (Memory.debug) console.log('TaskProcess_MinimumUpgradeController:' + room.name); // DEBUG

    const roomCache = GameCache.Room[room.name];
    const cacheData = roomCache.Data;

    if (!HasNotEmptyCreep(cacheData)) return false;
    if (!NotUpgradeController(room)) return true;

    const controller = room.controller as StructureController;
    const creep = GetClosestObject(controller.pos, cacheData.CreepsIdleNotEmpty);
    SetTask(creep, Task.Harvest, controller, cacheData);
    RemoveObject(creep, cacheData.CreepsIdleNotEmpty);

    return true;
}

function HasEmptyCreep(cache: _RoomData): Boolean {
    return cache.CreepsIdleEmpty.length > 0;
}

function HasDroppedResource(cache: _RoomData): Boolean {
    return cache.DroppedResources.length > 0;
}

function TaskProcess_Pickup(room: Room): Boolean {
    if (Memory.debug) console.log('TaskProcess_Pickup:' + room.name); // DEBUG
    const roomCache = GameCache.Room[room.name];
    const cacheData = roomCache.Data;

    if (!HasEmptyCreep(cacheData)) return false;
    if (!HasDroppedResource(cacheData)) return true;

    for (const res of cacheData.DroppedResources) {
        if (cacheData.CreepsIdleEmpty.length == 0) return false;

        do {
            const creep = GetClosestObject(res.pos, cacheData.CreepsIdleEmpty);
            SetTask(creep, Task.Pickup, res, cacheData);
            RemoveObject(creep, cacheData.CreepsIdleEmpty);

            const creepCarry = creep.carryCapacity;
            cacheData.ResourcesAmount[res.id] -= creepCarry;

        } while (cacheData.ResourcesAmount[res.id] > 0 && cacheData.CreepsIdleEmpty.length > 0)
    }

    return cacheData.CreepsIdleEmpty.length > 0
}

function HasHarvestRoom(cache: _RoomData) {
    return cache.Sources.length > 0;
}

function TaskProcess_Harvest(room: Room): Boolean {
    if (Memory.debug) console.log('TaskProcess_Harvest:' + room.name); // DEBUG
    const roomCache = GameCache.Room[room.name];
    const cacheData = roomCache.Data;

    if (!HasEmptyCreep(cacheData)) return false;
    if (!HasHarvestRoom(cacheData)) return true;

    do {
        const creep = cacheData.CreepsIdleEmpty.shift() as Creep;

        //const source = SourceHelper.FindHarvestSourceFor(creep, cache.TargetCounter);
        const source = GetClosestObject(creep.pos, cacheData.Sources);
        SetTask(creep, Task.Harvest, source, cacheData);
        RemoveObject(creep, cacheData.CreepsIdleEmpty);

        const sourceData = cacheData.SourcesData[source.id];

        sourceData.FreeRoom -= 1;
        const memory = Memory as MemoryExt;
        const max = memory.sources[source.id].max;
        const teamLength = SourceHelper.CalcTeamLength(max - sourceData.FreeRoom, max);

        const hasLongTeam = SourceHelper.IsLongTeam(teamLength)
        if (!hasLongTeam) {
            //sourceData.RemainingRate -= SourceHelper.CalcHarvestRate(creep, source);
            if (sourceData.RemainingRate > 0) {
                continue;
            }
        }

        RemoveObject(source, cacheData.Sources);
        if (cacheData.Sources.length == 0) return true;

    } while (cacheData.CreepsIdleEmpty.length > 0);

    return cacheData.Sources.length == 0;
}

function IsFullBase(cache: _RoomData) {
    return cache.BaseBuildings.length == 0;
}

function TaskProcess_FillBase(room: Room): Boolean {
    if (Memory.debug) console.log('TaskProcess_FillBase:' + room.name); // DEBUG
    const roomCache = GameCache.Room[room.name];
    const cacheData = roomCache.Data;

    if (!HasNotEmptyCreep(cacheData)) return false;
    if (IsFullBase(cacheData)) return true;

    do {
        const creep = cacheData.CreepsIdleNotEmpty.shift() as Creep;
        const building = GetClosestObject(creep.pos, cacheData.BaseBuildings);
        SetTask(creep, Task.Transfer, building, cacheData);
        RemoveObject(creep, cacheData.CreepsIdleNotEmpty);

        cacheData.BaseBuildingsCapacity[building.id] -= creep.carry.energy;
        if (cacheData.BaseBuildingsCapacity[building.id] <= 0) {
            RemoveObject(building, cacheData.BaseBuildings);
            if (cacheData.BaseBuildings.length == 0) break;
        }

    } while (cacheData.CreepsIdleNotEmpty.length > 0);

    return cacheData.CreepsIdleNotEmpty.length > 0;
}

function HasNotFullTower(cache: _RoomData): Boolean {
    return cache.Towers.length > 0;
}

function TaskProcess_FillTower(room: Room): Boolean {
    if (Memory.debug) console.log('TaskProcess_FillTower:' + room.name); // DEBUG
    const roomCache = GameCache.Room[room.name];
    const cacheData = roomCache.Data;

    if (!HasNotEmptyCreep(cacheData)) return false;
    if (!HasNotFullTower(cacheData)) return true;

    do {
        const creep = cacheData.CreepsIdleNotEmpty.shift() as Creep;
        const tower = GetClosestObject(creep.pos, cacheData.Towers);
        SetTask(creep, Task.Transfer, tower, cacheData);
        RemoveObject(creep, cacheData.CreepsIdleNotEmpty);

        cacheData.TowersCapacity[tower.id] -= creep.carry.energy;
        if (cacheData.TowersCapacity[tower.id] <= 0) {
            RemoveObject(tower, cacheData.Towers);
            if (cacheData.Towers.length == 0) break;
        }

    } while (cacheData.CreepsIdleNotEmpty.length > 0);

    return cacheData.CreepsIdleNotEmpty.length > 0;
}

function HasConstructionSite(cache: _RoomData): Boolean {
    return cache.ConstructionSites.length > 0;
}

function HasBrokenStructure(cache: _RoomData): Boolean {
    return cache.BrokenStructures.length > 0;
}

function TaskProcess_WithdrawEnergy(room: Room): Boolean {
    if (Memory.debug) console.log('TaskProcess_WithdrawEnergy:' + room.name); // DEBUG
    const roomCache = GameCache.Room[room.name];
    const cacheData = roomCache.Data;

    if (!HasEmptyCreep(cacheData)) return false;
    if (!HasConstructionSite(cacheData)) return true;
    if (!HasBrokenStructure(cacheData)) return true;
    if (!HasNotEmptyStore(cacheData)) return true;

    do {
        const creep = cacheData.CreepsIdleEmpty.shift() as Creep;
        const store = GetClosestObject(creep.pos, cacheData.NotEmptyStores);
        SetTask(creep, Task.Withdraw, store, cacheData);
        RemoveObject(creep, cacheData.CreepsIdleEmpty);

        cacheData.NotEmptyStoresEnergy[store.id] -= creep.carryCapacity;
        if (cacheData.NotEmptyStoresEnergy[store.id] <= 0) {
            RemoveObject(store, cacheData.NotEmptyStores);
            if (cacheData.NotEmptyStores.length == 0) break;
        }

    } while (cacheData.NotEmptyStores.length > 0);

    return cacheData.NotEmptyStores.length > 0;
}

function TaskProcess_Build(room: Room): Boolean {
    if (Memory.debug) console.log('TaskProcess_Build:' + room.name); // DEBUG
    const roomCache = GameCache.Room[room.name];
    const cacheData = roomCache.Data;

    if (!HasNotEmptyCreep(cacheData)) return false;
    if (!HasConstructionSite(cacheData)) return true;

    do {
        const creep = cacheData.CreepsIdleNotEmpty.shift() as Creep;
        const site = GetClosestObject(creep.pos, cacheData.ConstructionSites);
        SetTask(creep, Task.Build, site, cacheData);
        RemoveObject(creep, cacheData.CreepsIdleNotEmpty);

    } while (cacheData.CreepsIdleNotEmpty.length > 0)

    return cacheData.CreepsIdleNotEmpty.length > 0;
}

function TaskProcess_Repair(room: Room): Boolean {
    if (Memory.debug) console.log('TaskProcess_Repair:' + room.name); // DEBUG
    const roomCache = GameCache.Room[room.name];
    const cacheData = roomCache.Data;

    if (!HasNotEmptyCreep(cacheData)) return false;
    if (!HasBrokenStructure(cacheData)) return true;

    do {
        const creep = cacheData.CreepsIdleNotEmpty.shift() as Creep;
        const broken = GetClosestObject(creep.pos, cacheData.BrokenStructures);
        SetTask(creep, Task.Repair, broken, cacheData);
        RemoveObject(creep, cacheData.CreepsIdleNotEmpty);

        cacheData.BrokenStructuresDamaged[broken.id] -= creep.carry.energy * 100;
        if (cacheData.NotEmptyStoresEnergy[broken.id] <= 0) {
            RemoveObject(broken, cacheData.BrokenStructures);
            if (cacheData.BrokenStructures.length == 0) break;
        }

    } while (cacheData.CreepsIdleNotEmpty.length > 0)

    return cacheData.CreepsIdleNotEmpty.length > 0;
}

function HasNotEmptyStore(cache: _RoomData): Boolean {
    return cache.NotEmptyStores.length > 0;
}

function TaskProcess_FillStore(room: Room): Boolean {
    if (Memory.debug) console.log('TaskProcess_FillStore:' + room.name); // DEBUG
    const roomCache = GameCache.Room[room.name];
    const cacheData = roomCache.Data;

    if (!HasNotEmptyCreep(cacheData)) return false;
    if (!HasNotEmptyStore(cacheData)) return true;

    do {
        const creep = cacheData.CreepsIdleNotEmpty.shift() as Creep;
        const store = GetClosestObject(creep.pos, cacheData.NotEmptyStores);
        SetTask(creep, Task.Transfer, store, cacheData);
        RemoveObject(creep, cacheData.CreepsIdleNotEmpty);

        cacheData.NotEmptyStoresEnergy[store.id] -= _.sum(creep.carry);
        if (cacheData.NotEmptyStoresEnergy[store.id] <= 0) {
            RemoveObject(store, cacheData.NotEmptyStores);
            if (cacheData.NotEmptyStores.length == 0) break;
        }

    } while (cacheData.CreepsIdleNotEmpty.length > 0)

    return cacheData.CreepsIdleNotEmpty.length > 0;
}

function TaskProcess_UpgradeController(room: Room): Boolean {
    if (Memory.debug) console.log('TaskProcess_UpgradeController:' + room.name); // DEBUG
    const roomCache = GameCache.Room[room.name];
    const cacheData = roomCache.Data;

    if (!HasNotEmptyCreep(cacheData)) return false;

    const controller = room.controller as StructureController;
    do {
        const creep = cacheData.CreepsIdleNotEmpty.shift() as Creep;
        SetTask(creep, Task.UpgradeController, controller, cacheData);
        RemoveObject(creep, cacheData.CreepsIdleNotEmpty);

    } while (cacheData.CreepsIdleNotEmpty.length > 0)

    return false;
}

function Check_BuildTask(creep: Creep, cache: _RoomData) {
    const creepMemory = creep.memory as CreepMemoryExt;
    const structure = Game.getObjectById(creepMemory.TaskTargetID) as Structure;
    if (structure == null
        || CreepHelper.IsCreepEmpty(creep)
        || SiteHelper.IsConstructionSite(structure)) {
        SetIdleTask(creep, cache);
    }
}

function Check_HarvestTask(creep: Creep, cache: _RoomData) {
    const creepMemory = creep.memory as CreepMemoryExt;
    const source = Game.getObjectById(creepMemory.TaskTargetID) as Source;
    if (CreepHelper.IsCreepFull(creep)
        || SourceHelper.IsSourceEmpty(source)) {
        SetIdleTask(creep, cache);
    }
}

function Check_PickupTask(creep: Creep, cache: _RoomData) {
    const creepMemory = creep.memory as CreepMemoryExt;
    const resource = Game.getObjectById(creepMemory.TaskTargetID) as Resource;

    if (resource == null || CreepHelper.IsCreepFull(creep)) {
        SetIdleTask(creep, cache);
    }
}

function Check_RepairTask(creep: Creep, cache: _RoomData) {
    const creepMemory = creep.memory as CreepMemoryExt;
    const structure = Game.getObjectById(creepMemory.TaskTargetID) as Structure;

    if (structure == null
        || CreepHelper.IsCreepEmpty(creep)
        || structure.hits == structure.hitsMax) {
        SetIdleTask(creep, cache);
    }
}

function Check_TransferTask(creep: Creep, cache: _RoomData) {
    const creepMemory = creep.memory as CreepMemoryExt;
    const structure = Game.getObjectById(creepMemory.TaskTargetID) as Structure;

    if (structure == null
        || CreepHelper.IsCreepEmpty(creep)
        || StructureHelper.IsFullStructure(structure)) {
        SetIdleTask(creep, cache);
    }
}

function Check_UpgradeControllerTask(creep: Creep, cache: _RoomData) {
    const creepMemory = creep.memory as CreepMemoryExt;

    if (CreepHelper.IsCreepEmpty(creep)) {
        SetIdleTask(creep, cache);
    }
}

function Check_WithdrawTask(creep: Creep, cache: _RoomData) {
    const creepMemory = creep.memory as CreepMemoryExt;
    const structure = Game.getObjectById(creepMemory.TaskTargetID) as Structure;

    if (structure == null
        || CreepHelper.IsCreepEmpty(creep)
        || StructureHelper.IsEmptyStructure(structure)) {
        SetIdleTask(creep, cache);
    }
}
