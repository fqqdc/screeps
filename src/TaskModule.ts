import { Task } from "Constant";
import WorldManager from "game/WorldManager";
import { CreepMemoryExt } from "helper";
import { CreepHelper } from "helper/CreepHelper";
import { SourceHelper } from "helper/SourceHelper";

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
        //seq.push(TaskProcess_Pickup); //2
        seq.push(TaskProcess_Harvest); //3
        seq.push(TaskProcess_FillBase); //4
        //seq.push(TaskProcess_FillTower); //5
        //seq.push(TaskProcess_WithdrawEnergy); //6
        //seq.push(TaskProcess_Build); //7
        //seq.push(TaskProcess_Repair); //8
        //seq.push(TaskProcess_FillStore); //9
        //seq.push(TaskProcess_UpgradeController); //10

        return seq;
    }

    private Check_ExistedTasks(room: Room): void {
        //console.log('Process_ExistedTasks:' + room.name); // DEBUG

        for (const creep of roomCache.creeps) {
            const creepMemory = creep.memory as CreepMemoryExt;
            switch (creepMemory.Task) {
                //case Task.Build:
                //    Check_BuildTask(creep, cacheData); break;
                case Task.Harvest:
                    Check_HarvestTask(creep); break;
                //case Task.Pickup:
                //    Check_PickupTask(creep, cacheData); break;
                //case Task.Repair:
                //    Check_RepairTask(creep, cacheData); break;
                case Task.Transfer:
                    Check_TransferTask(creep); break;
                case Task.UpgradeController:
                    Check_UpgradeControllerTask(creep); break;
                //case Task.Withdraw:
                //    Check_WithdrawTask(creep, cacheData); break;
            }
        }
    }
}

function Check_HarvestTask(creep: Creep) {
    const creepMemory = creep.memory as CreepMemoryExt;
    const source = Game.getObjectById(creepMemory.TaskTargetID) as Source;
    const rm = WorldManager.Entity.QueryRoom(creep.room);

    if (CreepHelper.IsCreepFull(creep)
        || SourceHelper.IsSourceEmpty(source)) {
        rm.SetTask(creep, Task.Idle);
    }
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

function TaskProcess_MinimumUpgradeController(room: Room): Boolean {
    if (Memory.debug) console.log('TaskProcess_MinimumUpgradeController:' + room.name); // DEBUG
    const rm = WorldManager.Entity.QueryRoom(room);

    if (rm.GetIdleNotEmptyCreeps().length == 0) return false;
    if (!rm.NotUpgradeControllerTask()) return true;

    const controller = room.controller as StructureController;
    const creep = GetClosestObject(controller.pos, rm.GetIdleNotEmptyCreeps());
    rm.SetTask(creep, Task.Harvest, controller);

    return true;
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

    if (rm.GetIdleNotEmptyCreeps().length == 0) return false;
    if (rm.GetNoFullSpawnRelateds().length == 0) return true;

    const creeps = rm.GetIdleNotEmptyCreeps();
    do {
        const creep = creeps.shift() as Creep;
        const building = GetClosestObject(creep.pos, rm.GetNoFullSpawnRelateds());

        rm.SetTask(creep, Task.Transfer, building);

        if (rm.GetNoFullSpawnRelateds().length == 0) break;

    } while (creeps.length > 0);

    return creeps.length > 0;
}

