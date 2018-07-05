import { Cache } from "helper";

export const RoomHelper = {
    GetNotFullSpawn: (room: Room) => {
        const cache = Cache.FindCache(room);
        for (const spawn of cache.spawns) {
            if (spawn.energy < spawn.energyCapacity)
                return spawn;
        }
        return null;
    },

    GetNotFullExtension: (room: Room) => {
        const cache = Cache.FindCache(room);
        for (const extension of cache.extensions) {
            if (extension.energy < extension.energyCapacity)
                return extension;
        }
        return null;
    },

    CalcStoreEnergy(room: Room): Number {
        let energy = 0;
        const structures = room.find(FIND_STRUCTURES);
        for (const structure of structures) {
            switch (structure.structureType) {
                case STRUCTURE_CONTAINER:
                case STRUCTURE_STORAGE:
                    energy += structure.store.energy;
                    break;
            }
        }
        return energy;
    },
}
