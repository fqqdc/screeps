import { CreepMemoryExt, RoomCache, MemoryExt, GameCache } from "helper";
import { Task, Roler } from "Constant";
import WorldManager from "game/WorldManager";

function InitRoomMemory(room: Room, cache: RoomCache) {
    const memory = Memory as MemoryExt;

    const sources = room.find(FIND_SOURCES);
    for (const source of sources) {
        if (memory[source.id] == undefined) {
            memory[source.id] = { max: Number.NaN };
        }
        cache.sources.push(source);
    }

    const spawns = room.find(FIND_MY_SPAWNS)
    for (const spawn of spawns) {
        cache.spawns.push(spawn);

        if (spawn.spawning) {
            var spawningCreep = Game.creeps[spawn.spawning.name];
            var pos = spawn.pos;
            spawn.room.visual.text(
                '🛠️' + spawningCreep.name, pos.x + 1, pos.y, { align: 'left', opacity: 0.8 });
        }
    }

    const creeps = room.find(FIND_MY_CREEPS)
    for (const creep of creeps) {
        if (creep.spawning) continue;
        cache.creeps.push(creep);
    }

    const structures = room.find(FIND_MY_STRUCTURES)
    for (const structure of structures) {
        switch (structure.structureType) {
            case STRUCTURE_EXTENSION:
                cache.extensions.push(structure);
                break;
        }
    }
}

export default class GameModule {
    Run() {
        WorldManager.Entity.ScanRooms();
    }
}

