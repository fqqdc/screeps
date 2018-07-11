import { CreepMemoryExt, AutomaticTaskTarget } from "helper";
import { Task } from "Constant";
import { BaseAction, TransferAction, HarvestAction, IdleAction } from "action/BaseAction";
import RoomManager from "game/RoomManager";
import WorldManager from "game/WorldManager";

export abstract class Automatic extends BaseAction {
    protected memory: CreepMemoryExt
    protected rm: RoomManager;

    constructor(creep: Creep) {
        super(creep);
        this.memory = creep.memory as CreepMemoryExt;
        this.rm = WorldManager.Entity.QueryRoom(this.creep.room);
    }

    abstract init(): void;
    abstract SwitchTask(): void;


    Run() {
        if (this.AutoTask == undefined) this.init();
        this.SwitchTask();

        switch (this.memory.AutoTask) {
            case Task.Harvest:
                new HarvestAction(this.creep, this.AutoTaskTarget.TargetID).Run(); break;
            case Task.Transfer:
                new TransferAction(this.creep, this.AutoTaskTarget.TargetID).Run(); break;
            case Task.Idle:
                new IdleAction(this.creep);
        }
    }

    set AutoTask(value: Task) {
        this.memory.AutoTask = value;
    }

    get AutoTask(): Task {
        if (this.memory.AutoTask)
            this.memory.AutoTask = Task.Idle;

        return this.memory.AutoTask;
    }

    get AutoTaskTarget(): AutomaticTaskTarget {
        if (this.memory.AutoTaskTarget)
            this.memory.AutoTaskTarget = {};

        return this.memory.AutoTaskTarget;
    }

    IsFullTarget(targetId?: string): boolean {
        const struct = Game.getObjectById<AnyStructure>(targetId);
        if (struct && struct instanceof Structure) {
            switch (struct.structureType) {
                case STRUCTURE_EXTENSION:
                case STRUCTURE_SPAWN:
                case STRUCTURE_TOWER:
                    return struct.energyCapacity == struct.energy;
                case STRUCTURE_STORAGE:
                case STRUCTURE_CONTAINER:
                    return struct.storeCapacity == _.sum(struct.store);
            }
        }
        return true;
    }

    IsEmptyEnergyTarget(targetId?: string): boolean {
        const object = Game.getObjectById<RoomObject>(targetId);
        if (object) {
            if (object instanceof Structure) {
                const struct = object as AnyStructure;
                switch (struct.structureType) {
                    case STRUCTURE_EXTENSION:
                    case STRUCTURE_SPAWN:
                    case STRUCTURE_TOWER:
                        return struct.energy == 0;
                    case STRUCTURE_STORAGE:
                    case STRUCTURE_CONTAINER:
                        return struct.store.energy == 0;
                }
            } else if (object instanceof Source) {
                const source = object as Source;
                return source.energy == 0 && source.ticksToRegeneration < 15;
            }
        }

        return true;
    }
}

namespace Func {

    export function GetClosestObject<T extends _HasRoomPosition>(from: RoomPosition, arr: T[]): T {
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

    export function GetCanHarvestSources(): Source[] {
        return [];
    }

    export function GetNoFullSpawns(): StructureSpawnRelated[] {
        return [];
    }

    export function GetNoFullStores(): StructureStoreable[] {
        return [];
    }

}

export class HarvsetAutomatic extends Automatic {
    constructor(creep: Creep) {
        super(creep);
    }

    private GetClosestTransferTarget(): StructureSpawnRelated | StructureStoreable | undefined {
        const baseStructs = Func.GetNoFullSpawns();
        const storeStructs = Func.GetNoFullStores();
        let target;
        if (baseStructs.length > 0) target = Func.GetClosestObject(this.creep.pos, baseStructs);
        else if (storeStructs.length > 0) target = Func.GetClosestObject(this.creep.pos, storeStructs);
        return target;
    }

    private GetClosestHarvestTarget(): Source | undefined {
        const sources = Func.GetCanHarvestSources();
        let target;
        if (sources.length > 0) target = Func.GetClosestObject(this.creep.pos, sources);
        return target;
    }

    private SwitchToTransfer(): boolean {
        const target = this.GetClosestTransferTarget();
        if (target) {
            this.AutoTaskTarget.TargetID = target.id;
            this.AutoTask = Task.Transfer;
            return true;
        }
        return false;
    }

    private SwitchToHarvest(): boolean {
        const target = this.GetClosestHarvestTarget();
        if (target) {
            this.AutoTaskTarget.TargetID = target.id;
            this.AutoTask = Task.Harvest;
            return true;
        }
        return false;
    }

    private SwitchToIdle(): boolean {
        this.AutoTask = Task.Idle;
        return true;
    }

    init(): void {
        if (this.IsFull()) {
            if (!this.SwitchToTransfer())
                this.SwitchToIdle();
        } else {
            if (!this.SwitchToHarvest())
                this.SwitchToIdle();
        }
    }

    SwitchTask(): void {
        switch (this.memory.AutoTask) {
            case Task.Transfer:
                if (this.IsEmpty()) {
                    if (!this.SwitchToHarvest())
                        this.SwitchToIdle();
                } else {
                    if (this.IsFullTarget(this.AutoTaskTarget.TargetID)) {
                        if (!this.SwitchToTransfer())
                            this.SwitchToIdle();
                    }
                }
                break;
            case Task.Harvest:
                if (this.IsFull()
                    || this.IsEmptyEnergyTarget(this.AutoTaskTarget.TargetID)) {
                    if (!this.SwitchToTransfer())
                        this.SwitchToIdle();
                } 
                break;
            case Task.Idle:
                if (!this.IsFull()) {
                    if (!this.SwitchToHarvest())
                        if (!this.IsEmpty() && !this.SwitchToTransfer())
                            this.SwitchToIdle();
                } else {
                    if (!this.SwitchToTransfer())
                        this.SwitchToIdle();
                }
                break;
        }
    }
}
