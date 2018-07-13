import RoomManager from "./RoomManager";
import { Task } from "Constant";
import { CreepMemoryExt } from "helper";
import { ResourceData } from "./Interfaces";

export abstract class TaskManager {
    constructor(protected roomManager: RoomManager) {
    }

    abstract RequestTask(creep: Creep): boolean
    abstract IsEmpty(): boolean;
}

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

        this.data.sort((a, b) => a.amount - b.amount);
        const c = creep.carryCapacity - _.sum(creep.carry);
        let best = this.data[0], i = 0;
        for (let i = 1; i < this.data.length; ) {
            if (best.amount > c) break;
            best = this.data[i];
            i += 1;
        }

        best.amount -= c;
        if (best.amount <= 0) this.data.splice(i, 1);
        return true;
    }

    IsEmpty(): boolean {
        return this.data.length == 0;
    }
}
