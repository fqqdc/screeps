import GameSet from "helper/Set";

class ResourceData {
    pickup: GameSet<Creep>;

    constructor() {
        this.pickup = new GameSet();
    }
}

class TowerData {
    transfer: GameSet<Creep>;

    constructor() {
        this.transfer = new GameSet();
    }
}

class StructureData {
    repair: GameSet<Creep>;
    withdraw: GameSet<Creep>;
    transfer: GameSet<Creep>;

    constructor() {
        this.repair = new GameSet();
        this.withdraw = new GameSet();
        this.transfer = new GameSet();
    }
}
