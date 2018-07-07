import { CreepMemoryExt, GetGameObjects } from "helper";
import { Task } from "Constant";
import RoomData from "./RoomData";
import { SourceHelper } from "helper/SourceHelper";

export default class RoomManager {
    private static entitys: { [name: string]: RoomManager };
    static Create(room: Room, data: RoomData) {
        if (RoomManager.entitys == undefined)
            RoomManager.entitys = {};
        if (RoomManager.entitys[room.name] == undefined)
            RoomManager.entitys[room.name] = new RoomManager(data);

        return RoomManager.entitys[room.name];
    }

    private data: RoomData;
    private constructor(data: RoomData) {
        this.data = data;
    }

    private removeObject<T>(o: T, arr: T[]) {
        for (let i = 0; i < arr.length; i++) {
            if (o == arr[i]) {
                arr.splice(i, 1);
            }
        }
    }

    private updateCreep(creep: Creep) {
        const creepMemory = creep.memory as CreepMemoryExt;

        if (creepMemory.Task == Task.Idle) {
            if (_.sum(creep.carry) == 0) this.data.idleEmptyCreeps.push(creep.id);
            else this.data.idleNotEmptyCreeps.push(creep.id);
            delete creepMemory.TaskTargetID;
        } else {
            this.removeObject(creep.id, this.data.idleEmptyCreeps);
            this.removeObject(creep.id, this.data.idleNotEmptyCreeps);
        }
    }

    private updateAddHarvestSource(creepId: string, sourceId: string) {
        const sourceData = this.data.sourceData[sourceId];
        sourceData.workers.push(creepId);
        //TODO
        sourceData.harvestRate += SourceHelper.CalcHarvestRate(Game.getObjectById<Creep>(creepId));


        if (sourceData.workers.length >= sourceData.maxRoom && sourceData.harvestRate <= 0) {
            this.removeObject(sourceId, this.data.canHarvestSources);
        }
    }

    private updateTransferSpawn(creep: Creep, struct: StructureSpawnRelated) {
        const structData = this.data.structureData[struct.id];
        structData.transfer += creep.carry.energy;

        if (structData.transfer + struct.energy > struct.energyCapacity) {
            this.removeObject(struct.id, this.data.noFullSpawnRelateds);
        }
    }

    private updateOldTask(creep: Creep) {
        const creepMemory = creep.memory as CreepMemoryExt;
        const oldTargetID = creepMemory.TaskTargetID;
        const oldTask = creepMemory.Task;
        const taskTargetCounter = this.data.taskTargetCounter;
        const taskCounter = this.data.taskCounter;

        if (oldTargetID != undefined
            && taskTargetCounter[oldTargetID] != undefined
            && taskTargetCounter[oldTargetID] > 1) {
            taskTargetCounter[oldTargetID] -= 1;
        }
        if (taskTargetCounter[oldTask] != undefined
            && taskTargetCounter[oldTask] > 1) {
            taskTargetCounter[oldTask] -= 1;
        }

        if (creepMemory.Task == Task.Idle) {
            this.removeObject(creep.id, this.data.idleEmptyCreeps);
            this.removeObject(creep.id, this.data.idleNotEmptyCreeps);
        }

        if (creepMemory.Task == Task.Harvest) {
            const source = Game.getObjectById<Source>(oldTargetID);
            //TODO
            const sourceData = this.data.sourceData[oldTargetID];
            this.removeObject(creep.Id, sourceData.workers);
            sourceData.harvestRate += SourceHelper.CalcHarvestRate(Game.getObjectById<Creep>(creepId));
            creep.body.filter


            if (sourceData.workers.length >= sourceData.maxRoom && sourceData.CalcHarvestRate() <= 0) {
                this.removeObject(sourceId, this.data.canHarvestSources);
            }
        }
    }


    SetTask(creep: Creep, task: Task, target?: TaskTarget) {
        const creepMemory = creep.memory as CreepMemoryExt;
        const oldTargetID = creepMemory.TaskTargetID;
        const oldTask = creepMemory.Task;

        const taskTargetCounter = this.data.taskTargetCounter;
        const taskCounter = this.data.taskCounter;

        if (oldTargetID != undefined
            && taskTargetCounter[oldTargetID] != undefined
            && taskTargetCounter[oldTargetID] > 1) {
            taskTargetCounter[oldTargetID] -= 1;
        }
        if (taskTargetCounter[oldTask] != undefined
            && taskTargetCounter[oldTask] > 1) {
            taskTargetCounter[oldTask] -= 1;
        }

        creepMemory.Task = task;
        if (taskTargetCounter[task] == undefined) taskTargetCounter[task] = 1;
        else taskTargetCounter[task] += 1;



        if (task == Task.Idle) {
            delete creepMemory.TaskTargetID;
        } else {
            const realTarget = target as TaskTarget;
            creepMemory.TaskTargetID = realTarget.id;
            if (taskTargetCounter[realTarget.id] == undefined) {
                taskTargetCounter[realTarget.id] = 0
            } else {
                taskTargetCounter[realTarget.id] += 1;
            }
        }

        this.updateCreep(creep);
        switch (task) {
            case Task.Harvest:
                this.updateAddHarvestSource(creep.id, (target as Source).id); break;
            case Task.Transfer:
                const realTarget = target as AnyStructure;
                switch (realTarget.structureType) {
                    case STRUCTURE_SPAWN:
                    case STRUCTURE_EXTENSION:
                        this.updateTransferSpawn(creep, realTarget);
                        break;
                }
        }

    }

    NotUpgradeControllerTask(): Boolean {
        for (const creep of GetGameObjects<Creep>(this.data.creeps)) {
            if ((creep.memory as CreepMemoryExt).Task == Task.UpgradeController)
                return false;
        }
        return true;
    }

    GetNoFullSpawnRelateds(): StructureSpawnRelated[] {
        const arr = GetGameObjects<StructureSpawnRelated>(this.data.noFullSpawnRelateds);
        return arr;
    }

    GetIdleNotEmptyCreeps(): Creep[] {
        return GetGameObjects<Creep>(this.data.idleNotEmptyCreeps);
    }

    GetIdleEmptyCreeps(): Creep[] {
        return GetGameObjects<Creep>(this.data.idleEmptyCreeps);
    }

    GetCanHarvestSources(): Source[] {
        return GetGameObjects<Source>(this.data.canHarvestSources);
    }

    IsFullHarvestToSource(sourceId: string) {
        const sourceData = this.data.sourceData[sourceId];
        return sourceData.workers.length >= sourceData.maxRoom && sourceData.harvestRate <= 0;
    }
}
