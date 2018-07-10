import { Task } from "Constant";
import WorldManager from "game/WorldManager";
import { CreepMemoryExt } from "helper";
import { CreepHelper } from "helper/CreepHelper";
import { SourceHelper } from "helper/SourceHelper";
import { StructureHelper } from "helper/StructureHelper";
import { SiteHelper } from "helper/SiteHelper";
import RoomManager from "game/RoomManager";

type TaskProcess = { (room: Room): Boolean }

export default class TaskModule {
    constructor() { }
    Run() {
        for (const roomName in Game.rooms) {
            const room = Game.rooms[roomName];
            if (room.controller == null || !room.controller.my) continue;

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
        seq.push(TaskProcess_FillStorages); //9
        //seq.push(TaskProcess_UpgradeController); //10

        return seq;
    }

    private Check_ExistedTasks(room: Room): void {
        //console.log('Process_ExistedTasks:' + room.name); // DEBUG
        const creeps = room.find(FIND_MY_CREEPS);
        for (const creep of creeps) {
            const creepMemory = creep.memory as CreepMemoryExt;
            switch (creepMemory.Task) {
                case Task.Build:
                    Check_BuildTask(creep); break;
                case Task.Harvest:
                    Check_HarvestTask(creep); break;
                case Task.Pickup:
                    Check_PickupTask(creep); break;
                case Task.Repair:
                    Check_RepairTask(creep); break;
                case Task.Transfer:
                    Check_TransferTask(creep); break;
                case Task.UpgradeController:
                    Check_UpgradeControllerTask(creep); break;
                case Task.Withdraw:
                    Check_WithdrawTask(creep); break;
            }
        }
    }
}

function Check_BuildTask(creep: Creep) {
    const creepMemory = creep.memory as CreepMemoryExt;
    if (creepMemory.debug) console.log('Check_BuildTask:' + creep.name); // DEBUG
    const site = Game.getObjectById(creepMemory.TaskTargetID) as AnyStructure | ConstructionSite;
    const rm = WorldManager.Entity.QueryRoom(creep.room);

    if (site == null
        || CreepHelper.IsCreepEmptyEnergy(creep)
        || !SiteHelper.IsConstructionSite(site)) {
        rm.SetTask(creep, Task.Idle);
    }
}

function Check_HarvestTask(creep: Creep) {
    const creepMemory = creep.memory as CreepMemoryExt;
    if (creepMemory.debug) console.log('Check_HarvestTask:' + creep.name); // DEBUG
    const source = Game.getObjectById<Source>(creepMemory.TaskTargetID);
    const rm = WorldManager.Entity.QueryRoom(creep.room);

    if (source == null
        || CreepHelper.IsCreepFull(creep)
        || SourceHelper.IsSourceEmpty(source)) {
        rm.SetTask(creep, Task.Idle);
    }
}

function Check_PickupTask(creep: Creep) {
    const creepMemory = creep.memory as CreepMemoryExt;
    if (creepMemory.debug) console.log('Check_PickupTask:' + creep.name); // DEBUG    
    const res = Game.getObjectById<Resource>(creepMemory.TaskTargetID);
    const rm = WorldManager.Entity.QueryRoom(creep.room);

    if (res == null || CreepHelper.IsCreepFull(creep)) {
        rm.SetTask(creep, Task.Idle);
    }
}

function Check_RepairTask(creep: Creep) {
    const creepMemory = creep.memory as CreepMemoryExt;
    if (creepMemory.debug) console.log('Check_RepairTask:' + creep.name); // DEBUG
    const rm = WorldManager.Entity.QueryRoom(creep.room);
    const structure = Game.getObjectById(creepMemory.TaskTargetID) as AnyStructure;

    if (structure == null
        || CreepHelper.IsCreepEmptyEnergy(creep)
        || structure.hits == structure.hitsMax) {
        rm.SetTask(creep, Task.Idle);
    }
}

function Check_TransferTask(creep: Creep) {
    const creepMemory = creep.memory as CreepMemoryExt;
    if (creepMemory.debug) console.log('Check_TransferTask:' + creep.name); // DEBUG
    const structure = Game.getObjectById<Structure>(creepMemory.TaskTargetID);
    const rm = WorldManager.Entity.QueryRoom(creep.room);

    if (structure == null
        || CreepHelper.IsCreepEmptyEnergy(creep) && (structure.structureType == STRUCTURE_EXTENSION
            || structure.structureType == STRUCTURE_SPAWN
            || structure.structureType == STRUCTURE_TOWER)
        || CreepHelper.IsCreepEmpty(creep)
        || StructureHelper.IsFullStructure(structure)) {
        rm.SetTask(creep, Task.Idle);
    }
}

function Check_UpgradeControllerTask(creep: Creep) {
    const creepMemory = creep.memory as CreepMemoryExt;
    if (creepMemory.debug) console.log('Check_UpgradeControllerTask:' + creep.name); // DEBUG    
    const rm = WorldManager.Entity.QueryRoom(creep.room);

    if (CreepHelper.IsCreepEmptyEnergy(creep)) {
        rm.SetTask(creep, Task.Idle);
    }
}

function Check_WithdrawTask(creep: Creep) {
    const creepMemory = creep.memory as CreepMemoryExt;
    if (creepMemory.debug) console.log('Check_WithdrawTask:' + creep.name); // DEBUG    
    const structure = Game.getObjectById(creepMemory.TaskTargetID) as Structure;
    const rm = WorldManager.Entity.QueryRoom(creep.room);

    if (structure == null
        || !CreepHelper.IsCreepEmpty(creep)
        || StructureHelper.IsEmptyStructure(structure)) {
        rm.SetTask(creep, Task.Idle);
    }
}

function GetClosestObject<T extends _HasRoomPosition>(from: RoomPosition, arr: T[]): T {
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

function TaskProcess_MinimumUpgradeController(room: Room): Boolean {
    if (Memory.debug) console.log('TaskProcess_MinimumUpgradeController:' + room.name); // DEBUG
    const rm = WorldManager.Entity.QueryRoom(room);

    if (rm.GetIdleHasEnergyCreeps().length == 0) return false;
    if (rm.CalcTask(Task.UpgradeController) > 0) return true;

    const controller = room.controller as StructureController;
    const creep = GetClosestObject(controller.pos, rm.GetIdleHasEnergyCreeps());
    rm.SetTask(creep, Task.UpgradeController, controller);

    return true;
}

function TaskProcess_Pickup(room: Room): Boolean {
    if (Memory.debug) console.log('TaskProcess_Pickup:' + room.name); // DEBUG
    const rm = WorldManager.Entity.QueryRoom(room);

    if (rm.GetIdleEmptyCreeps().length == 0) return false;
    if (rm.GetCanPickupResources().length == 0) return true;

    const creeps = rm.GetIdleEmptyCreeps();
    let resources = rm.GetCanPickupResources();
    do {
        const creep = creeps.shift() as Creep;
        const res = GetClosestObject(creep.pos, resources);

        rm.SetTask(creep, Task.Pickup, res);

        resources = rm.GetCanPickupResources();
        if (resources.length == 0) return true;

    } while (creeps.length > 0);

    return resources.length == 0;
}

function TaskProcess_Harvest(room: Room): Boolean {
    if (Memory.debug) console.log('TaskProcess_Harvest:' + room.name); // DEBUG
    const rm = WorldManager.Entity.QueryRoom(room);

    if (rm.GetIdleEmptyCreeps().length == 0) return false;
    if (rm.GetCanHarvestSources().length == 0) return true;

    const creeps = rm.GetIdleEmptyCreeps();
    let sources = rm.GetCanHarvestSources();
    do {
        const creep = creeps.shift() as Creep;
        const source = GetClosestObject(creep.pos, sources);

        rm.SetTask(creep, Task.Harvest, source);

        sources = rm.GetCanHarvestSources();
        if (sources.length == 0) return true;

    } while (creeps.length > 0);

    return sources.length == 0;
}

function TaskProcess_FillBase(room: Room): Boolean {
    if (Memory.debug) console.log('TaskProcess_FillBase:' + room.name); // DEBUG
    const rm = WorldManager.Entity.QueryRoom(room);

    if (rm.GetIdleHasEnergyCreeps().length == 0) return false;
    if (rm.GetNoFullSpawnRelateds().length == 0) return true;

    const creeps = rm.GetIdleHasEnergyCreeps();
    do {
        const creep = creeps.shift() as Creep;
        const building = GetClosestObject(creep.pos, rm.GetNoFullSpawnRelateds());

        rm.SetTask(creep, Task.Transfer, building);

        if (rm.GetNoFullSpawnRelateds().length == 0) break;

    } while (creeps.length > 0);

    return creeps.length > 0;
}

function TaskProcess_FillTower(room: Room): Boolean {
    if (Memory.debug) console.log('TaskProcess_FillTower:' + room.name); // DEBUG
    const rm = WorldManager.Entity.QueryRoom(room);

    if (rm.GetIdleHasEnergyCreeps().length == 0) return false;
    if (rm.GetNoFullTowers().length == 0) return true;

    const creeps = rm.GetIdleHasEnergyCreeps();
    do {
        const creep = creeps.shift() as Creep;
        const tower = GetClosestObject(creep.pos, rm.GetNoFullTowers());

        rm.SetTask(creep, Task.Transfer, tower);

        if (rm.GetNoFullTowers().length == 0) break;

    } while (creeps.length > 0);

    return creeps.length > 0;
}

function TaskProcess_WithdrawEnergy(room: Room): Boolean {
    if (Memory.debug) console.log('TaskProcess_WithdrawEnergy:' + room.name); // DEBUG
    const rm = WorldManager.Entity.QueryRoom(room);

    if (rm.GetIdleEmptyCreeps().length == 0) return false;
    if (rm.CalcTask(Task.UpgradeController) != 0
        || (rm.GetConstructionSites().length == 0 && rm.GetBrokenStructures().length == 0)
    ) return true;
    if (rm.GetNoEmptyStorages().length == 0) return true;

    const creeps = rm.GetIdleEmptyCreeps();
    //do {
        const creep = creeps.shift() as Creep;
        const storage = GetClosestObject(creep.pos, rm.GetNoEmptyStorages());

        rm.SetTask(creep, Task.Withdraw, storage);
        //if (rm.GetNoEmptyStorages().length == 0) break;

    //} while (creeps.length > 0);

    return creeps.length > 0;
}

function TaskProcess_Build(room: Room): Boolean {
    if (Memory.debug) console.log('TaskProcess_Build:' + room.name); // DEBUG
    const rm = WorldManager.Entity.QueryRoom(room);

    if (rm.GetIdleHasEnergyCreeps().length == 0) return false;
    if (rm.GetConstructionSites().length == 0) return true;

    const creeps = rm.GetIdleHasEnergyCreeps();
    //do {
        const creep = creeps.shift() as Creep;
        const site = GetClosestObject(creep.pos, rm.GetConstructionSites());
        rm.SetTask(creep, Task.Build, site);

    //} while (creeps.length > 0)

    return creeps.length > 0;
}

function TaskProcess_FillStorages(room: Room): Boolean {
    if (Memory.debug) console.log('TaskProcess_FillStorages:' + room.name); // DEBUG
    const rm = WorldManager.Entity.QueryRoom(room);

    if (rm.GetIdleNotEmptyCreeps().length == 0) return false;
    if (rm.GetNoFullStorages().length == 0) return true;

    const creeps = rm.GetIdleNotEmptyCreeps();
    do {
        const creep = creeps.shift() as Creep;
        const storage = GetClosestObject(creep.pos, rm.GetNoFullStorages());

        rm.SetTask(creep, Task.Transfer, storage);
        if (rm.GetNoFullTowers().length == 0) break;

    } while (creeps.length > 0);

    return creeps.length > 0;
}

function TaskProcess_Repair(room: Room): Boolean {
    if (Memory.debug) console.log('TaskProcess_Repair:' + room.name); // DEBUG
    const rm = WorldManager.Entity.QueryRoom(room);

    if (rm.GetIdleHasEnergyCreeps().length == 0) return false;
    if (rm.GetBrokenStructures().length == 0) return true;

    const creeps = rm.GetIdleHasEnergyCreeps();
    //do {
        const creep = creeps.shift() as Creep;
        const broken = GetClosestObject(creep.pos, rm.GetBrokenStructures());

        rm.SetTask(creep, Task.Repair, broken);
        //if (rm.GetBrokenStructures().length == 0) break;


    //} while (creeps.length > 0);

    return creeps.length > 0;
}
