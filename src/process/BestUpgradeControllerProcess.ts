import BaseProcess from "process/BaseProcess";
import { RoomHelper } from "helper/RoomHelper";
import { SourceHelper } from "helper/SourceHelper";
import { Cache, CreepMemoryExt } from "helper";
import { Task } from "Constant";
import { ProcessResult } from "process/ProcessResult ";

export default class BestUpgradeControllerProcess extends BaseProcess {
    constructor(room:Room) {
        super(room, {});
    }


    private ConditionBaseResourcesIsFull(): Boolean {
        return (RoomHelper.GetNotFullSpawn(this.room) == null
            && RoomHelper.GetNotFullExtension(this.room) == null);
    }

    private ConditionUpgradeControllerRate(): Number {
        const roomCache = Cache.Room[this.room.name];
        let upgradeRate = 0

        for (const creep of roomCache.creeps) {
            const memory = creep.memory as CreepMemoryExt;
            if (memory.Task != Task.UpgradeController)
                continue;

            upgradeRate += creep.getActiveBodyparts(WORK) * 1;
        }
        return upgradeRate;
    }

    private idleEnergy: Number;
    private ConditionIdleResources(): Number {
        if (this.idleEnergy == undefined)
            this.idleEnergy = RoomHelper.CalcStoreEnergy(this.room);






















































































                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         

        return this.idleEnergy;
    }

    private sourceRate: Number;
    private ConditionSourceRate(): Number {
        if (this.sourceRate == undefined)
            this.sourceRate = SourceHelper.CalcRoomExpectRate(this.room);

        return this.sourceRate;
    }


    Run(): ProcessResult {
        const A = this.ConditionIdleResources;
        const B = this.ConditionUpgradeControllerRate;
        const C = this.ConditionBaseResourcesIsFull;
        const D = this.ConditionSourceRate;

        if (A() > 0
            && B() < D()) {

            return ProcessResult.Executing;
        }
    }
}
