import { CreepMemoryExt, MemoryExt, RoomMemoryExt, GetClosestObjectByRange } from "helper";
import { Roler, Task } from "Constant";
import { SpawnHelper } from "helper/SpawnHelper";
import WorldManager from "game/WorldManager";
import RoomManager from "game/RoomManager";

export default class ProduceModule {
    Run() {
        Process_ProduceWork();
        Process_TowerWork();
        Process_SetConstructionSite()
    }
}

function c_NoEmptyCreeps(rm: RoomManager) {
    return rm.GetIdleEmptyCreeps().length != 0
        || rm.GetIdleNotEmptyCreeps().length != 0;
}

function c_HasCanPickupResources(rm: RoomManager) {
    return rm.GetCanPickupResources().length != 0
        && rm.CalcTask(Task.Build) == 0
        && rm.CalcTask(Task.Repair) == 0;
}

function c_HasCanHarvestSources(rm: RoomManager) {
    return rm.GetCanHarvestSources().length != 0
        && rm.CalcTask(Task.Build) == 0
        && rm.CalcTask(Task.Repair) == 0;
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

        if (c_NoEmptyCreeps(rm)) continue;

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
            const closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
            if (closestHostile != null) {
                tower.attack(closestHostile);
            }

            if (tower.energy < tower.energyCapacity * 0.5)
                return;

            if (rm.CalcTask(Task.Repair) != 0) return;
            const closestDamagedStructure = GetClosestObjectByRange(tower.pos, rm.GetBrokenStructures());
            if (closestDamagedStructure) {
                tower.repair(closestDamagedStructure);
            }
        }
    }
}

function Process_SetConstructionSite() {
    for (const name in Game.rooms) {
        const room = Game.rooms[name];
        const rm = WorldManager.Entity.QueryRoom(room);

        if (rm.GetConstructionSites().length != 0) return;
        if (rm.GetIdleHasEnergyCreeps().length == 0) return;

        const mem = room.memory as RoomMemoryExt;
        if (!mem.trace || Object.keys(mem.trace).length == 0) return;

        const trace = Object.entries(mem.trace);
        const sorted = trace.sort((a, b) => a["1"] - b["1"]);
        const last = sorted.pop() as [string, number];

        if (last["1"] > 15) {
            const x = Number.parseInt(last["0"]) % 50;
            const y = (Number.parseInt(last["0"]) - x) / 50;

            console.log(`last ${last["0"]}:${last["1"]}`);
            console.log(`(${x},${y}) need road`);

            const pos = new RoomPosition(x, y, name);
            console.log(pos);
            const r = pos.createConstructionSite(STRUCTURE_ROAD);
            if (r == OK) delete mem.trace[last["0"]];
            else console.log("create site error:" + r)
        }
    }
}
