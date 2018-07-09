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

    private updateRoomData(value: { Task: Task, TaskTargetID: string }) {
        switch (value.Task) {
            case Task.Harvest:
                const source = Game.getObjectById<Source>(value.TaskTargetID);
                if (source) this.data.updateCanHarvestSources(source);
                break;
            case Task.Transfer:
            case Task.Repair:
            case Task.Withdraw:
                const struct = Game.getObjectById<AnyStructure>(value.TaskTargetID);
                if (struct) this.data.updateStructure(struct);
                else this.data.removeNotExistStructure(value.TaskTargetID);
                break;
            case Task.Pickup:
                const res = Game.getObjectById<Resource>(value.TaskTargetID);
                if (res) this.data.updataResource(res);
                else this.data.removeResource(value.TaskTargetID)
                break;
            case Task.Build:
                const site = Game.getObjectById<ConstructionSite>(value.TaskTargetID)
                if (site) this.data.updateConstructionSite(site);
                else this.data.removeConstructionSite(value.TaskTargetID);
                break;
        }
    }

    SetTask(creep: Creep, task: Task, target?: TaskTarget) {
        //console.log(creep.name + " SetTask " + Task[task] + ":" + target)

        const creepMemory = creep.memory as CreepMemoryExt;
        const oldValue = { Task: creepMemory.Task, TaskTargetID: creepMemory.TaskTargetID };

        this.data.removeCreepFromCounter(creep.id);

        creepMemory.Task = task;
        if (task == Task.Idle) {
            delete creepMemory.TaskTargetID;
        } else {
            creepMemory.TaskTargetID = (target as TaskTarget).id;
        }

        this.data.addCreepToCounter(creep);
        this.data.updateCreep(creep);

        this.updateRoomData(oldValue);
        this.updateRoomData({ Task: creepMemory.Task, TaskTargetID: creepMemory.TaskTargetID });
    }

    NotUpgradeControllerTask(): Boolean {
        const set = this.data.taskCounter[Task.UpgradeController];
        if (set) {
            return set.size == 0;
        }
        return true;
    }

    CalcTask(task: Task): Number {
        const set = this.data.taskCounter[task];
        if (set) return set.size;
        return 0;
    }

    GetNoFullSpawnRelateds(): StructureSpawnRelated[] {
        return GetGameObjects<StructureSpawnRelated>(this.data.noFullSpawnRelateds.values());
    }

    GetIdleNotEmptyCreeps(): Creep[] {
        return GetGameObjects<Creep>(this.data.idleNotEmptyCreeps.values());
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

    UpdateSpawnRelateds() {
        this.data.structures.forEach(id => {
            const struct = Game.getObjectById<AnyStructure>(id);
            if (struct) this.data.updateStructure(struct);
        });
    }
}
