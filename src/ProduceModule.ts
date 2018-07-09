import { CreepMemoryExt } from "helper";
import { Roler, Task } from "Constant";
import { SpawnHelper } from "helper/SpawnHelper";
import WorldManager from "game/WorldManager";

export default class ProduceModule {
    Run() {
        Process_ProduceWork();
        Process_TowerWork();
    }
}

function Process_ProduceWork() {
    for (const name in Game.rooms) {
        const room = Game.rooms[name];
        const rm = WorldManager.Entity.QueryRoom(room);

        if (rm.GetIdleEmptyCreeps().length != 0) continue;

        const fullBaseCondition: { (): Boolean } = () => {
            return rm.GetConstructionSites().length != 0
                || rm.GetBrokenStructures().length != 0
                || rm.GetNoEmptyStorages().length != 0
        };

        if (rm.GetCanPickupResources().length != 0
            || rm.GetCanHarvestSources().length != 0
            || (rm.GetNoFullSpawnRelateds().length == 0 && fullBaseCondition())
        ) {
            const spawns = room.find(FIND_MY_SPAWNS);
            for (const spawn of spawns) {
                if (!spawn.spawning) {
                    SpawnHelper.CreateCreep(spawn, "MMWC", Roler.Worker);
                }
            }
        }
    }
}

function Process_TowerWork() {
    //console.log('Process_TowerWork:' + msg.roomTaskResults.length); // DEBUG

    for (const n in Game.structures) {
        const structure = Game.structures[n];
        if (structure.structureType == STRUCTURE_TOWER) {

            let tower = structure as StructureTower;
            var closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
            if (closestHostile != null) {
                tower.attack(closestHostile);
            }

            if (tower.energy < tower.energyCapacity * 0.5)
                return;

            var closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: (structure) => structure.hits < structure.hitsMax * 0.5
            });

            if (closestDamagedStructure) {
                tower.repair(closestDamagedStructure);
            }
        }
    }

}
