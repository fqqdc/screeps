import { CreepMemoryExt, RoomMemoryExt, randomInt } from "helper";
import { Task, Automatic } from "Constant"
import { HarvsetAutomatic } from "automatic/Automatic";
import { BaseAction, IdleAction, HarvestAction, TransferAction, UpgradeControllerAction, WithdrawAction, BuildAction, RepairAction, PickupAction } from "action/BaseAction";

export default class ActionModule {
    Run() {
        for (const name in Game.creeps) {
            const creep = Game.creeps[name];
            if (creep.spawning) continue;

            let memory = creep.memory as CreepMemoryExt;
            if (memory.debug) console.log('PROCESS Action:' + creep.name); // DEBUG

            let action: BaseAction = new IdleAction(creep);
            if (memory.Automatic == undefined
                || memory.Automatic == Automatic.None) {
                
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

            } else {

                switch (memory.Automatic) {
                    case Automatic.Harvest:
                        action = new HarvsetAutomatic(creep);
                }

            }
            action.Run();
        }
    }
}


