import { CreepMemoryExt, Cache, RoomCache, MemoryExt } from "helper";
import { Task, Roler } from "Constant";
import { SpawnHelper } from "helper/spawn";

function HasNoneTaskCreep(room: Room) {
    const roomCache = Cache.FindCache(room);
    for (const creep of roomCache.creeps) {
        if (!creep.spawning) continue;

        const memory = creep.memory as CreepMemoryExt;
        if (memory.Task == Task.None)
            return true;
    }
    return false;
}

function CountCreeps(room: Room) {
    const roomCache = Cache.FindCache(room);
    return roomCache.creeps.length;
}

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
        const memory = Memory as MemoryExt;
        if (memory.sources == undefined) memory.sources = {};
        const cache = Cache;

        const rooms = Game.rooms
        for (const n in rooms) {
            const room: Room = rooms[n];
            const roomCache = new RoomCache(room);

            cache.rooms.push(roomCache);
            cache.Room[room.name] = roomCache;

            InitRoomMemory(room, roomCache);
        }
    }
}

