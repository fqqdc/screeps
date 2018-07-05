import { Message, Cache } from "helper";
import { Roler } from "Constant";
import { SpawnHelper } from "helper/spawn";

export default class ProduceModule {
    Run(msg: Message) {
        Process_ProduceWork(msg);
        Process_TowerWork(msg);
    }
}

function Process_ProduceWork(msg: Message) {
    //console.log('Process_ProduceWork:' + msg.roomTaskResults.length); // DEBUG
    for (const roomMsg of msg.roomTaskResults) {
        if (roomMsg.needMoreWorker) {
            const cache = Cache.FindCache(roomMsg.room);
            for (const spawn of cache.spawns) {
                SpawnHelper.CreateCreep(spawn, "MMWC", Roler.Worker);
            }
        }
    }
}

function Process_TowerWork(msg: Message) {
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
