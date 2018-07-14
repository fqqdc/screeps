import { TaskManager } from "./TaskManager";
import RoomManager from "game/RoomManager";
import { ResourceData, SourceData } from "game/Interfaces";
import { GetClosestObjectByPath, GetGameObjects, CreepMemoryExt } from "helper";
import { Task } from "Constant";

export class TMHarvest extends TaskManager {
    constructor(roomManager: RoomManager) {
        super(roomManager);

        const rm = this.roomManager;
        this.data = rm.SoucesData;
    }

    private data: SourceData[];

    RequestTask(creep: Creep): boolean {
        if (this.IsEmpty()) return false;
        if (Memory.debug) console.log('Harvest TaskManager:' + this.roomManager.RoomName); // DEBUG

        this.data.sort((a, b) => (a.maxRoom - a.nWorker) - (b.maxRoom - b.nWorker));
        this.data.reverse();

        const d = this.data[0];
        d.nWorker += 1;
        if (d.nWorker >= d.maxRoom) this.data.shift();

        const cMemory = creep.memory as CreepMemoryExt;
        cMemory.Task = Task.Harvest;
        cMemory.TaskTargetID = d.id;
        return true;
    }

    IsEmpty(): boolean {
        return this.data.length == 0;
    }
}
