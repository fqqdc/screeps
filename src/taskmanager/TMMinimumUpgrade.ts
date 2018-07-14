import { TaskManager } from "./TaskManager";
import RoomManager from "game/RoomManager";
import { CreepMemoryExt } from "helper";
import { Task } from "Constant";

export class TMMinimumUpgrade extends TaskManager {
    constructor(roomManager: RoomManager) {
        super(roomManager);

        const rm = this.roomManager;
        this.nUpgradeTask = rm.GetCreepsFromTarget(rm.Controller, Task.UpgradeController).length;
        this.controllerId = rm.Controller.id;
    }

    private nUpgradeTask: number;
    private controllerId: string;

    RequestTask(creep: Creep): boolean {
        if (this.IsEmpty()) return false;
        if (Memory.debug) console.log('MinimumUpgrade TaskManager:' + this.roomManager.RoomName); // DEBUG

        const cMemory = creep.memory as CreepMemoryExt;
        cMemory.Task = Task.UpgradeController;
        cMemory.TaskTargetID = this.controllerId;
        this.nUpgradeTask += 1;
        return true;
    }

    IsEmpty(): boolean {
        return this.nUpgradeTask > 1;
    }
}
