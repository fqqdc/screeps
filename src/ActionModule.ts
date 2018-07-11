import { CreepMemoryExt, RoomMemoryExt, randomInt } from "helper";
import { Task } from "Constant"

export default class ActionModule {
    Run() {
        for (const name in Game.creeps) {
            const creep = Game.creeps[name];
            if (creep.spawning) continue;

            let memory = creep.memory as CreepMemoryExt;
            if (memory.debug) console.log('PROCESS Action:' + creep.name); // DEBUG

            let action: BaseAction = new IdleAction(creep);
            switch (memory.Task) {
                case Task.Harvest:
                    action = new HarvestAction(creep, memory.TaskTargetID);
                    break;
                case Task.Transfer:
                    action = new TransferAction(creep);
                    break;
                case Task.UpgradeController:
                    action = new UpgradeControllerAction(creep);
                    break;
                case Task.Withdraw:
                    action = new WithdrawAction(creep);
                    break;
                case Task.Build:
                    action = new BuildAction(creep);
                    break;
                case Task.Idle:
                    action = new IdleAction(creep);
                    break;
                case Task.Repair:
                    action = new RepairAction(creep);
                    break;
                case Task.Pickup:
                    action = new PickupAction(creep);
                    break;
            }
            action.Run();
        }
    }
}

export abstract class BaseAction {
    constructor(creep: Creep) {
        this.creep = creep;
    }

    protected creep: Creep;
    protected whiteColor: PolyStyle = { stroke: '#ffffff' };
    protected orangeColor: PolyStyle = { stroke: '#ffaa00' };
    protected blueColor: PolyStyle = { stroke: '#0000ff' };
    protected greenColor: PolyStyle = { stroke: '#00ff00' };

    get TaskTarget(): TaskTarget {
        let taskTargetID = (this.creep.memory as CreepMemoryExt).TaskTargetID;
        return Game.getObjectById(taskTargetID) as TaskTarget;
    }

    InRangeTo(to: RoomPosition, range: number) {
        const from = this.creep.pos;;

        return from.roomName == to.roomName &&
            from.inRangeTo(to.x, to.y, range)
    }

    MoveTo(to: RoomPosition, opts?: MoveToOpts) {
        if (this.creep.fatigue == 0) {
            this.creep.moveTo(to, opts);
        } else {
            const room = Game.rooms[to.roomName];
            if (room) {
                const mem = room.memory as RoomMemoryExt;
                if (!mem.trace) mem.trace = {};
                const nMove = this.creep.getActiveBodyparts(MOVE);
                if (nMove == 0) return;

                const pos = this.creep.pos;
                const sites = pos.lookFor(LOOK_CONSTRUCTION_SITES);
                for (const s of sites) {
                    if (s.structureType == STRUCTURE_ROAD) return;
                }

                const structs = pos.lookFor(LOOK_STRUCTURES);
                for (const s of structs) {
                    if (s.structureType == STRUCTURE_ROAD) return;
                }

                const index = pos.y * 50 + pos.x;
                if (mem.trace[index])
                    mem.trace[index] += this.creep.fatigue / nMove;
                else mem.trace[index] = this.creep.fatigue / nMove;
            }
        }
    }

    Say(message: string) {
        if (Math.random() * 1000 % 5 == 0) {
            this.creep.say(message);
        }
    }

    IsFull(): boolean {
        return this.creep.carryCapacity == _.sum(this.creep.carry);
    }

    IsEmpty(): boolean {
        return 0 == _.sum(this.creep.carry);
    }

    abstract Run(): void;
}

export class IdleAction extends BaseAction {
    constructor(creep: Creep) {
        super(creep);
    }

    hasRoad(pos: RoomPosition) {
        const structs = pos.lookFor(LOOK_STRUCTURES);
        for (const s of structs) {
            if (s.structureType == STRUCTURE_ROAD) return true;
        }
        return false;
    }

    Run() {
        const creep = this.creep;
        const memory = creep.memory as CreepMemoryExt
        if (memory.debug) console.log(creep.name + ' IdleAction');

        if (creep.fatigue == 0) {
            const x = creep.pos.x, y = creep.pos.y, name = creep.room.name;
            const swamp: RoomPosition[] = [];
            const road: RoomPosition[] = [];

            for (let dx = -1; dx <= 1; dx++)
                for (let dy = -1; dy <= 1; dy++) {
                    const t = (Game.map.getTerrainAt(x + dx, y + dy, name));
                    if (x + dx <= 0 || x + dx >= 49 || y + dy <= 0 || y + dy >= 49)
                        continue;
                    switch (t) {
                        case "plain":
                            road.push(new RoomPosition(x + dx, y + dy, name)); break;
                        case "swamp":
                            swamp.push(new RoomPosition(x + dx, y + dy, name)); break;
                        default:
                            continue;
                    }
                }
            let toPos: RoomPosition | undefined;
            for (const p of swamp) {
                if (this.hasRoad(p))
                    road.push(p);
            }

            if (road.length == 0) {
                if (swamp.length == 0) { }
                else { toPos = swamp[randomInt(swamp.length)]; }
            } else { toPos = road[randomInt(road.length)]; }

            if (toPos) creep.moveTo(toPos);
        }
    }
}

export class HarvestAction extends BaseAction {
    constructor(creep: Creep, private targetId?: string) {
        super(creep);
    }

    Run() {
        const creep = this.creep;
        const memory = creep.memory as CreepMemoryExt
        if (memory.debug) console.log(creep.name + ' HarvestAction');
        const target = Game.getObjectById(this.targetId) as Source;
        if (!target) return;

        if (memory.debug) console.log(creep.name + ' HarvestAction ' + 'InRangeTo'); //DEBUG
        if (!this.InRangeTo(target.pos, 1)) {
            this.MoveTo(target.pos, { visualizePathStyle: this.orangeColor });
            this.Say('⛏harvest');
            return;
        }
        if (memory.debug) console.log(creep.name + ' HarvestAction ' + 'harvest'); //DEBUG
        const result = creep.harvest(target);
        if (result != OK) {
            if (result == ERR_NOT_ENOUGH_RESOURCES && target.ticksToRegeneration <= 15) return;
            console.log(creep.name + ' harvest ' + target.id + ' r:' + result + " [" + Task[memory.Task] + "]");
        }
    }
}

export class TransferAction extends BaseAction {
    constructor(creep: Creep, private targetId?: string) {
        super(creep);
    }

    Run() {
        const creep = this.creep;
        const memory = creep.memory as CreepMemoryExt
        if (memory.debug) console.log(creep.name + ' transferAction');
        let target = this.TaskTarget as Structure;
        if (!target) return;

        if (memory.debug) console.log(creep.name + ' transferAction ' + 'inRangeTo'); //DEBUG
        if (!this.InRangeTo(target.pos, 1)) {
            this.MoveTo(target.pos, { visualizePathStyle: this.blueColor });
            this.Say('🚚transfer');
            return;
        }
        if (memory.debug) console.log(this.creep.name + ' transferAction ' + 'transfer'); //DEBUG

        let result: ScreepsReturnCode = OK;
        for (const t in creep.carry) {
            if (creep.carry[t as ResourceConstant] == 0) continue;
            result = creep.transfer(target, t as ResourceConstant);
            break;
        }
        if (result != OK)
            console.log(creep.name + ' transferAction:' + result);
    }
}

class UpgradeControllerAction extends BaseAction {
    constructor(creep: Creep) {
        super(creep);
    }

    Run() {
        const creep = this.creep;
        const memory = creep.memory as CreepMemoryExt
        if (memory.debug) console.log(creep.name + ' upgradeControllerAction'); //DEBUG
        const target = this.TaskTarget as StructureController;

        if (memory.debug) console.log(this.creep.name + ' upgradeControllerAction ' + 'inRangeTo'); //DEBUG
        if (!this.InRangeTo(target.pos, 3)) {
            this.MoveTo(target.pos, { visualizePathStyle: this.whiteColor });
            this.Say('🛠upgrade');
            return;
        }

        if (memory.debug) console.log(creep.name + ' upgradeControllerAction ' + 'upgradeController'); //DEBUG
        const result = creep.upgradeController(target);
        if (result != OK)
            console.log(creep.name + ' upgradeControllerAction:' + result);
        return;
    }
}

class WithdrawAction extends BaseAction {
    constructor(creep: Creep) {
        super(creep);
    }

    Run() {
        const creep = this.creep;
        const memory = creep.memory as CreepMemoryExt
        if (memory.debug) console.log(creep.name + ' WithdrawAction'); //DEBUG
        let target = this.TaskTarget as Structure;

        if (memory.debug) console.log(creep.name + ' withdrawAction ' + 'inRangeTo'); //DEBUG
        if (!this.InRangeTo(target.pos, 1)) {
            this.MoveTo(target.pos, { visualizePathStyle: this.greenColor });
            this.Say('🖐withdraw');
            return;
        }

        if (memory.debug) console.log(creep.name + ' withdrawAction ' + 'withdraw'); //DEBUG
        const result = creep.withdraw(target, RESOURCE_ENERGY);
        if (result != OK)
            console.log(creep.name + ' withdraw:' + result);
        return;
    }
}

class PickupAction extends BaseAction {
    constructor(creep: Creep) {
        super(creep);
    }

    Run() {
        const creep = this.creep;
        const memory = creep.memory as CreepMemoryExt
        if (memory.debug) console.log(creep.name + ' PickupAction'); //DEBUG
        let target = this.TaskTarget as Resource;

        if (memory.debug) console.log(creep.name + ' pickupAction ' + 'inRangeTo'); //DEBUG
        if (!this.InRangeTo(target.pos, 1)) {
            this.MoveTo(target.pos, { visualizePathStyle: this.greenColor });
            this.Say('🖐pickup');
            return;
        }

        if (memory.debug) console.log(creep.name + ' pickupAction ' + 'pickup'); //DEBUG
        const result = creep.pickup(target);
        if (result != OK)
            console.log(creep.name + ' pickup:' + result);
        return;
    }
}

class BuildAction extends BaseAction {
    constructor(creep: Creep) {
        super(creep);
    }

    Run() {
        const creep = this.creep;
        const memory = creep.memory as CreepMemoryExt
        if (memory.debug) console.log(creep.name + ' BuildAction'); //DEBUG
        let target = this.TaskTarget as ConstructionSite;

        if (memory.debug) console.log(creep.name + ' buildAction ' + 'inRangeTo'); //DEBUG
        if (!this.InRangeTo(target.pos, 3)) {
            this.MoveTo(target.pos, { visualizePathStyle: this.whiteColor });
            this.Say('⚒build');
            return true;
        }

        if (memory.debug) console.log(creep.name + ' buildAction ' + 'build'); //DEBUG
        const result = creep.build(target);
        if (result != OK)
            console.log(creep.name + ' build:' + result);
        return true;
    }
}

class RepairAction extends BaseAction {
    constructor(creep: Creep) {
        super(creep);
    }

    Run() {
        const creep = this.creep;
        const memory = creep.memory as CreepMemoryExt
        if (memory.debug) console.log(creep.name + ' RepairAction'); //DEBUG
        let target = this.TaskTarget as AnyStructure;

        if (memory.debug) console.log(creep.name + ' repairAction ' + 'inRangeTo'); //DEBUG
        if (!this.InRangeTo(target.pos, 3)) {
            this.MoveTo(target.pos, { visualizePathStyle: this.whiteColor });
            this.Say('⚒repair');
            return true;
        }

        if (memory.debug) console.log(creep.name + ' repairAction ' + 'repair'); //DEBUG
        const result = creep.repair(target);
        if (result != OK)
            console.log(creep.name + ' repair:' + result);
        return true;
    }
}
