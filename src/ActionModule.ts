import { CreepMemoryExt } from "helper";
import { State, Task } from "Constant"

export default class ActionModule {
    Run() {
        for (const name in Game.creeps) {
            const creep = Game.creeps[name];
            if (creep.spawning) continue;

            let memory = creep.memory as CreepMemoryExt;
            if (memory.debug) console.log('PROCESS Action:' + creep.name); // DEBUG

            let action: BaseAction = new IdleAction(creep);
            switch (memory.State) {
                case State.Harvest:
                    action = new HarvestAction(creep);
                    break;
                case State.Transfer:
                    action = new TransferAction(creep);
                    break;
                case State.UpgradeController:
                    action = new UpgradeControllerAction(creep);
                    break;
                case State.Withdraw:
                    action = new WithdrawAction(creep);
                    break;
                case State.Build:
                    action = new BuildAction(creep);
                    break;
                case State.Idle:
                    action = new IdleAction(creep);
                    break;
            }
            action.Run();
        }
    }
}

abstract class BaseAction {
    constructor(creep: Creep) {
        this.creep = creep;
    }

    protected creep: Creep;
    protected whiteColor: PolyStyle = { stroke: '#ffffff' };
    protected orangeColor: PolyStyle = { stroke: '#ffaa00' };
    protected blueColor: PolyStyle = { stroke: '#0000ff' };
    protected greenColor: PolyStyle = { stroke: '#00ff00' };

    get StateTarget(): Structure | Source | Resource | ConstructionSite {
        let stateTargetID = (this.creep.memory as CreepMemoryExt).StateTargetID;
        return Game.getObjectById(stateTargetID) as Structure | Source;
    }

    InRangeTo(to: RoomPosition, range: number) {
        const from = this.creep.pos;;

        return from.roomName == to.roomName &&
            from.inRangeTo(to.x, to.y, range)
    }

    MoveTo(to: RoomPosition, opts?: MoveToOpts) {
        this.creep.moveTo(to, opts);
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
        return 0 == this.creep.carry.energy;
    }

    abstract Run(): void;
}

class IdleAction extends BaseAction {
    constructor(creep: Creep) {
        super(creep);
    }

    Run() {
        const creep = this.creep;
        const memory = creep.memory as CreepMemoryExt
        if (memory.debug) console.log(creep.name + ' IdleAction');
    }
}

class HarvestAction extends BaseAction {
    constructor(creep: Creep) {
        super(creep);
    }

    Run() {
        const creep = this.creep;
        const memory = creep.memory as CreepMemoryExt
        if (memory.debug) console.log(creep.name + ' HarvestAction');
        const target = this.StateTarget as Source;

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
            console.log(creep.name + ' harvest ' + target.id + ' r:' + result + " ["+Task[memory.Task]+"]");
        }
    }
}

class TransferAction extends BaseAction {
    constructor(creep: Creep) {
        super(creep);
    }

    Run() {
        const creep = this.creep;
        const memory = creep.memory as CreepMemoryExt
        if (memory.debug) console.log(creep.name + ' transferAction');
        let target = this.StateTarget as Structure;

        if (memory.debug) console.log(creep.name + ' transferAction ' + 'inRangeTo'); //DEBUG
        if (!this.InRangeTo(target.pos, 1)) {
            this.MoveTo(target.pos, { visualizePathStyle: this.whiteColor });
            this.Say('🚚transfer');
            return;
        }
        if (memory.debug) console.log(this.creep.name + ' transferAction ' + 'transfer'); //DEBUG
        const result = creep.transfer(target, RESOURCE_ENERGY);
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
        const target = this.StateTarget as StructureController;

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
        let target = this.StateTarget as Structure;

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
        if (memory.debug) console.log(creep.name + ' pickupAction ' + 'isFullCreep'); //DEBUG
        if (this.IsFull())
            return;
        let target = this.StateTarget as Resource;

        if (memory.debug) console.log(creep.name + ' pickupAction ' + 'targetIsNull'); //DEBUG
        if (target == null)
            return;

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
        if (memory.debug) console.log(creep.name + ' buildAction ' + 'isEmptyCreep'); //DEBUG
        if (this.IsEmpty())
            return;

        let target = this.StateTarget as ConstructionSite;
        if (memory.debug) console.log(creep.name + ' buildAction ' + 'targetIsNull'); //DEBUG
        if (target == null)
            return;

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
