import { Message, GameCache, CreepMemoryExt } from "helper";
import { Roler, Task } from "Constant";
import { SpawnHelper } from "helper/SpawnHelper";
import WorldManager from "game/WorldManager";

export default class ProduceModule {
    Run() {
        Process_ProduceWork();
        Process_TowerWork();
    }
}

function HasDroppedResource(room: Room): Boolean {
    const cache = GameCache.Room[room.name].Data;
    return cache.DroppedResources.length > 0;
}

function HasHarvestRoom(room: Room): Boolean {
    const cache = GameCache.Room[room.name].Data;
    return cache.Sources.length > 0;
}

function IsFullBase(room: Room): Boolean {
    const roomCache = GameCache.Room[room.name];
    let baseBuildings: StructureSpawnRelated[] = [];
    baseBuildings = baseBuildings.concat(roomCache.spawns);
    baseBuildings = baseBuildings.concat(roomCache.extensions);

    for (const baseBuilding of baseBuildings) {
        if (baseBuilding.energy < baseBuilding.energyCapacity)
            return false;
    }

    return true;
}

function HasConstructionSite(room: Room): Boolean {
    const cache = GameCache.Room[room.name].Data;
    return cache.ConstructionSites.length > 0;
}

function HasBrokenStructure(room: Room): Boolean {
    const cache = GameCache.Room[room.name].Data;
    return cache.BrokenStructures.length > 0;
}

function HasNotEmptyStore(room: Room): Boolean {
    const cache = GameCache.Room[room.name].Data;
    return cache.NotEmptyStores.length > 0;
}


function Process_ProduceWork() {
    for (const roomCache of GameCache.rooms) {
        const room = roomCache.room;
        const rm = WorldManager.Entity.QueryRoom(room);

        if (rm.GetIdleEmptyCreeps().length != 0) continue;

        //const fullBaseCondition: { (): Boolean } = () => {
        //    return HasConstructionSite(room)
        //        || HasBrokenStructure(room)
        //        || HasNotEmptyStore(room)
        //};

        if (//HasDroppedResource(room) ||
            rm.GetCanHarvestSources().length != 0
            //|| (IsFullBase(room) && fullBaseCondition())
        ) {

            for (const spawn of roomCache.spawns) {
                if (!spawn.spawning)
                    SpawnHelper.CreateCreep(spawn, "MMWC", Roler.Worker);
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
