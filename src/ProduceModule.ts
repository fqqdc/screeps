import { CreepMemoryExt } from "helper";
import { Roler, Task } from "Constant";
import { SpawnHelper } from "helper/SpawnHelper";
import WorldManager from "game/WorldManager";
import RoomManager from "game/RoomManager";

export default class ProduceModule {
    Run() {
        Process_ProduceWork();
        Process_TowerWork();
    }
}

function c_NoIdleEmptyCreeps(rm: RoomManager) {
    return rm.GetIdleEmptyCreeps().length != 0;
}

function c_HasCanPickupResources(rm: RoomManager) {
    return rm.GetCanPickupResources().length != 0;
}

function c_HasCanHarvestSources(rm: RoomManager) {
    return rm.GetCanHarvestSources().length != 0;
}

function c_HasFullBase(rm: RoomManager) {
    return rm.GetNoFullSpawnRelateds().length == 0;
}

function c_HasMoreEnergy(rm: RoomManager) {
    return rm.GetNoEmptyStorages().length != 0;
}

function c_NoManToBuild(rm: RoomManager) {
    return rm.GetConstructionSites().length != 0
        && rm.CalcTask(Task.Withdraw) == 0
        && rm.CalcTask(Task.Build) == 0;
}

function c_NoManToRepair(rm: RoomManager) {
    return rm.GetBrokenStructures().length != 0
        && rm.CalcTask(Task.Withdraw) == 0
        && rm.CalcTask(Task.Repair) == 0;
}



function Process_ProduceWork() {
    for (const name in Game.rooms) {
        const room = Game.rooms[name];
        const rm = WorldManager.Entity.QueryRoom(room);

        if (c_NoIdleEmptyCreeps(rm)) continue;

        const spawns = room.find(FIND_MY_SPAWNS);
        for (const spawn of spawns) {
            if (!spawn.spawning) {

                const condition: { (): Boolean } = () => {
                    return rm.GetConstructionSites().length != 0
                        || rm.GetBrokenStructures().length != 0
                };

                if (c_HasCanPickupResources(rm)
                    || c_HasCanHarvestSources(rm)
                    || (c_HasFullBase(rm) && c_HasMoreEnergy(rm) && (c_NoManToBuild(rm) || c_NoManToRepair(rm)))
                ) {
                    const c1 = c_HasCanPickupResources(rm);
                    const c2 = c_HasCanHarvestSources(rm);
                    const c3 = c_HasFullBase(rm);
                    const c33 = c_HasMoreEnergy(rm);
                    if (c1) console.log("1 HasCanPickupResources:" + c1);
                    if (c2) console.log("2 HasCanHarvestSources:" + c2);
                    if (c3) console.log("3 HasFullBase:" + c3);
                    if (c33) console.log("3 HasMoreEnergy:" + c33)

                    if (c_HasFullBase(rm) && c_HasMoreEnergy(rm)) {
                        console.log("..1 NoManToBuild:" + c_NoManToBuild(rm))
                        console.log("..2 NoManToRepair:" + c_NoManToRepair(rm))
                    }

                    SpawnHelper.CreateCreep(spawn, "MMWC", Roler.Worker);
                    break;
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
            const rm = WorldManager.Entity.QueryRoom(tower.room);
            var closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
            if (closestHostile != null) {
                tower.attack(closestHostile);
            }

            if (tower.energy < tower.energyCapacity * 0.5)
                return;

            var closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: (structure) => structure.hits < structure.hitsMax * 0.5
                    && rm.CalcTask(Task.Repair) == 0
            });

            if (closestDamagedStructure) {
                tower.repair(closestDamagedStructure);
            }
        }
    }

}
