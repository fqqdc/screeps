import { CreepMemoryExt, GetGameObjects } from "helper";
import { Task } from "Constant";
import { SourceHelper } from "helper/SourceHelper";
import RoomData from "game/RoomData";
import { ResourceData } from "./Interfaces";

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

    private updateRoomObject(task: Task, id: string) {
        switch (task) {
            case Task.Harvest:
                this.data.updateSourceById(id);
                break;
            case Task.Transfer:
            case Task.Repair:
            case Task.Withdraw:
                this.data.updateStructureById(id);
                break;
            case Task.Pickup:
                this.data.updateResourceById(id);
                break;
            case Task.Build:
                this.data.updateConstructionSiteById(id);
                break;
        }
    }

    SetTask(creep: Creep, task: Task, target?: TaskTarget) {
        //console.log(creep.name + " SetTask " + Task[task] + ":" + target)

        const creepMemory = creep.memory as CreepMemoryExt;
        const oldValue = { task: creepMemory.Task, id: creepMemory.TaskTargetID };

        this.data.removeCreepFromCounter(creep.id);
        creepMemory.Task = task;
        if (task == Task.Idle) {
            delete creepMemory.TaskTargetID;
        } else {
            creepMemory.TaskTargetID = (target as TaskTarget).id;
        }
        this.data.addCreepToCounter(creep.id);

        this.data.updateCreepById(creep.id);
        this.updateRoomObject(oldValue.task, oldValue.id);
        this.updateRoomObject(creepMemory.Task, creepMemory.TaskTargetID);
    }

    CalcTask(task: Task): number {
        const set = this.data.taskCounter[task];
        if (set) return set.size;
        return 0;
    }

    get Controller(): StructureController {
        throw "未实现";
    }

    get RoomName(): String {
        return this.data.name;
    }

    get ResourcesData(): ResourceData[] {
        throw "未实现";
    }

    GetCreepsFromTarget(target:RoomObject, task: Task): Creep[] {
        throw "未实现";
    }



    GetNoFullSpawnRelateds(): StructureSpawnRelated[] {
        return GetGameObjects<StructureSpawnRelated>(this.data.noFullSpawnRelateds.values());
    }

    GetIdleNotEmptyCreeps(): Creep[] {
        return GetGameObjects<Creep>(this.data.idleNotEmptyCreeps.values());
    }

    GetIdleHasEnergyCreeps(): Creep[] {
        return GetGameObjects<Creep>(this.data.idleHasEnergyCreeps.values());
    }

    GetIdleEmptyCreeps(): Creep[] {
        return GetGameObjects<Creep>(this.data.idleEmptyCreeps.values());
    }

    GetCanHarvestSources(): Source[] {
        return GetGameObjects<Source>(this.data.canHarvestSources.values());
    }

    GetNoFullTowers(): StructureTower[] {
        return GetGameObjects<StructureTower>(this.data.noFullTowers.values());
    }

    GetNoFullStorages(): StructureStoreable[] {
        return GetGameObjects<StructureStoreable>(this.data.noFullStorages.values());
    }

    GetNoEmptyStorages(): StructureStoreable[] {
        return GetGameObjects<StructureStoreable>(this.data.noEmptyStorages.values());
    }

    GetConstructionSites(): StructureStoreable[] {
        return GetGameObjects<StructureStoreable>(this.data.constructionSites.values());
    }

    GetBrokenStructures(): AnyStructure[] {
        return GetGameObjects<AnyStructure>(this.data.brokenStructures.values());
    }

    GetCanPickupResources(): Resource[] {
        return GetGameObjects<Resource>(this.data.canPickupResources.values());
    }
}
