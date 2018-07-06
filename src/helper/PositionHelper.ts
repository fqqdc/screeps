function _findCloset(pos: RoomPosition, arr: RoomObject[]): RoomObject | null {
    let best: RoomObject | null = null;
    let bestPL: number = 999;

    for (const o of arr) {
        const pathLength = pos.findPathTo(o).length;

        if (best == null) {
            best = o;
            bestPL = pathLength;
        } else if (pathLength < bestPL) {
            best = o;
            bestPL = pathLength;
        }
    }

    return best;
}

export const PositionHelper = {
    GetClosestObject: (pos: RoomPosition, arr: RoomObject[]) => {
        return _findCloset(pos, arr);
    },

    GetClosestNotFullContainer: (pos: RoomPosition): Structure | null => {
        const arrSpawnExtension = [];
        const arrTower = [];
        const arrContainerStorage = [];
        const structures = Game.rooms[pos.roomName].find(FIND_STRUCTURES);

        for (const structure of structures) {
            switch (structure.structureType) {
                case STRUCTURE_SPAWN:
                case STRUCTURE_EXTENSION:
                    if (structure.energy == structure.energyCapacity)
                        continue;
                    arrSpawnExtension.push(structure); break;
                case STRUCTURE_TOWER:
                    if (structure.energy == structure.energyCapacity)
                        continue;
                    arrTower.push(structure); break;
                case STRUCTURE_CONTAINER:
                case STRUCTURE_STORAGE:
                    if (_.sum(structure.store) == structure.storeCapacity)
                        continue;
                    arrContainerStorage.push(structure); break;
            }
        }

        let obj = _findCloset(pos, arrSpawnExtension) as Structure | null;
        if (obj) return obj;
        obj = _findCloset(pos, arrTower) as Structure | null;
        if (obj) return obj;
        obj = _findCloset(pos, arrContainerStorage) as Structure | null;
        if (obj) return obj;

        return null;
    }
}
