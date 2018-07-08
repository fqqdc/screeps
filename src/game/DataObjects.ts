import GameSet from "helper/Set";

class ResourceData {
    pickup: Set<string>;

    constructor() {
        this.pickup = new Set();
    }
}

class TowerData {
    transfer: Set<string>;

    constructor() {
        this.transfer = new Set();
    }
}


