class SourceData {
    max: number;
    harvest: number;
    worker: number;

    constructor() {
        this.max = 0;
        this.harvest = 0;
        this.worker = 0;
    }
}

class ResourceData {
    pickip: number;

    constructor() {
        this.pickip = 0;
    }
}

class ExtensionData {
    transfer: number;

    constructor() {
        this.transfer = 0;
    }
}

class TowerData {
    transfer: number;

    constructor() {
        this.transfer = 0;
    }
}

class StructureData {
    repair: number;
    withdraw: number;
    transfer: number;

    constructor(structure: Structure) {
        this.repair = 0;
        this.withdraw = 0;
        this.transfer = 0;
    }
}
