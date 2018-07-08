import { SourceHelper } from "helper/SourceHelper";

export default class SourceData {
    maxRoom: number;
    harvest: HashTable<any>;

    constructor() {
        this.maxRoom = 0;
        this.harvest = {};
    }

    CalcHarvestRate(): Number {
        let sum = 0
        for (const creepId in this.harvest) {
            const creep = Game.getObjectById<Creep>(creepId);
            sum += SourceHelper.CalcHarvestRate(creep);
        }
        return sum;
    }
}
