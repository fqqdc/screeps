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
                const struct = Game.getObjectById<AnyStructure>(value.TaskTargetID);
                if (struct) this.data.updateStructure(struct);
                break;
        }
    }

    SetTask(creep: Creep, task: Task, target?: TaskTarget) {
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
            return set.size > 0;
        }
        return false;
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
}
