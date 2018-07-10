export const CreepHelper = {
    IsCreepFull: function (creep: Creep): Boolean{
        return creep.carryCapacity == _.sum(creep.carry);
    },

    IsCreepEmptyEnergy: function (creep: Creep): Boolean {
        return creep.carry.energy == 0;
    },

    IsCreepEmpty: function (creep: Creep): Boolean {
        return _.sum(creep.carry) == 0;
    }

}
