export default class StructureData {
    repair: Set<string>;
    withdraw: Set<string>;
    transfer: Set<string>;

    constructor() {    
        this.repair = new Set();
        this.withdraw = new Set();
        this.transfer = new Set();
    }
}
