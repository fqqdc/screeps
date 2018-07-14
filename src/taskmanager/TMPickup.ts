import { TaskManager } from "./TaskManager";
import RoomManager from "game/RoomManager";
import { ResourceData } from "game/Interfaces";
import { CreepMemoryExt } from "helper";
import { Task } from "Constant";

export class TMPickup extends TaskManager {
    constructor(roomManager: RoomManager) {
        super(roomManager);

        const rm = this.roomManager;
        this.data = rm.ResourcesData;
    }

    private data: ResourceData[];

    RequestTask(creep: Creep): boolean {
        if (this.IsEmpty()) return false;
        if (Memory.debug) console.log('Pickup TaskManager:' + this.roomManager.RoomName); // DEBUG

        this.data.sort((a, b) => a.amount - b.amount)
        this.data.reverse();
        const c = creep.carryCapacity - _.sum(creep.carry);
        const d = this.data[0];
        d.amount -= c;
        if (d.amount <= 0) this.data.shift();

        const cMemory = creep.memory as CreepMemoryExt;
        cMemory.Task = Task.Pickup;
        cMemory.TaskTargetID = d.id;        

        return true;
    }

    IsEmpty(): boolean {
        return this.data.length == 0;
    }
}
