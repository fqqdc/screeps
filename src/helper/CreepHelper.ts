export const CreepHelper = {
    IsCreepFull: function (creep: Creep): Boolean{
        return creep.carryCapacity == _.sum(creep.carry);
    },

    IsCreepEmpty: function (creep: Creep): Boolean {
        return _.sum(creep.carry) == 0;
    }
}
