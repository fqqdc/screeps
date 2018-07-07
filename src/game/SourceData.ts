import { SourceHelper } from "helper/SourceHelper";

export default class SourceData {
    maxRoom: number;
    workers: string[];

    constructor() {
        this.maxRoom = 0;
        this.workers = [];
    }

    CalcHarvestRate(): Number {
        let sum = 0
        for (const creepId of this.workers) {
            const creep = Game.getObjectById<Creep>(creepId);
            sum += SourceHelper.CalcHarvestRate(creep);
        }
        return sum;
    }
}
