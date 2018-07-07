import { CreepMemoryExt, GetGameObjects } from "helper";
import { Task } from "Constant";
import RoomData from "./RoomData";

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

    SetTask(creep: Creep, task: Task, target: TaskTarget) {
        if (task == Task.Idle) throw "不能设置 Task.Idle 任务";
        const creepMemory = creep.memory as CreepMemoryExt;
        const oldTargetID = creepMemory.TaskTargetID;

        const counter = this.data.taskTargetCounter;
        if (counter[oldTargetID] == undefined
            || counter[oldTargetID] < 1) throw "TargetCounter 未知的计数错误";
        counter[oldTargetID] -= 1;

        creepMemory.Task = task;
        creepMemory.TaskTargetID = target.id;

        if (counter[target.id] == undefined) {
            counter[target.id] = 0
        } else {
            counter[target.id] += 1;
        }

        this.removeObject(creep.id, this.data.idleEmptyCreeps);
        this.removeObject(creep.id, this.data.idleNotEmptyCreeps);
    }

    HasNotEmptyCreep(): Boolean {
        const arr = GetGameObjects<Creep>(this.data.idleNotEmptyCreeps);
        return arr.length > 0;
    }

    HasEmptyCreep(): Boolean {
        const arr = GetGameObjects<Creep>(this.data.idleEmptyCreeps);
        return arr.length > 0;
    }

    NotUpgradeControllerTask(): Boolean {
        for (const creep of GetGameObjects<Creep>(this.data.creeps)) {
            if ((creep.memory as CreepMemoryExt).Task == Task.UpgradeController)
                return false;
        }
        return true;
    }

    HasHarvestRoom(): Boolean {
        const arr = GetGameObjects<Source>(this.data.canHarvestSources);
        return arr.length > 0;
    }

    GetIdleNotEmptyCreeps(): Creep[] {
        return GetGameObjects<Creep>(this.data.idleNotEmptyCreeps);
    }
}
