export const StructureHelper = {
    IsEmptyStructure: function (structure: Structure): Boolean {
        switch (structure.structureType) {
            case STRUCTURE_SPAWN:
            case STRUCTURE_EXTENSION:
            case STRUCTURE_TOWER:
                const energyStructure = structure as StructureSpawn | StructureExtension | StructureTower;
                return energyStructure.energy == 0;
            case STRUCTURE_CONTAINER:
            case STRUCTURE_STORAGE:
                const storeStructure = structure as StructureContainer | StructureStorage;
                return _.sum(storeStructure.store) == 0;
        }
        return true;
    },

    IsFullStructure: function (structure: Structure): Boolean {
        switch (structure.structureType) {
            case STRUCTURE_SPAWN:
            case STRUCTURE_EXTENSION:
            case STRUCTURE_TOWER:
                const energyStructure = structure as StructureSpawn | StructureExtension | StructureTower;
                return energyStructure.energy == energyStructure.energyCapacity;
            case STRUCTURE_CONTAINER:
            case STRUCTURE_STORAGE:
                const storeStructure = structure as StructureContainer | StructureStorage;
                return _.sum(storeStructure.store) == storeStructure.storeCapacity;
        }
        return true;
    }
}
