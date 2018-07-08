import { SourceHelper } from "helper/SourceHelper";

export default class SourceData {
    readonly maxRoom: number;

    constructor(source: Source) {
        this.maxRoom = SourceHelper.CalcMaxHarvestRoom(source);
    }
}
