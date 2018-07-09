import RoomManager from "./RoomManager";
import RoomData from "./RoomData";

export default class WorldManager {
    private static entity: WorldManager;
    static get Entity() {
        if (WorldManager.entity == undefined)
            WorldManager.entity = new WorldManager();

        if (Memory.debug) RawMemory.segments[0] = JSON.stringify(WorldManager.entity, Set_toJSON);
        return WorldManager.entity;
    }

    private rooms: HashTable<RoomData>;

    private constructor() {
        this.rooms = {}
    }

    public ScanRooms() {
        const rooms = Game.rooms

        for (const n in rooms) {
            const room: Room = rooms[n];

            if (this.rooms[room.name] == undefined) {
                const roomData = new RoomData(room);
                this.rooms[room.name] = roomData;
            } else {
                this.rooms[room.name].updateCreeps(room);
                this.rooms[room.name].updateStructures(room);
                this.rooms[room.name].updateSources(room);
                this.rooms[room.name].updateConstructionSites(room);
            }
        }
    }

    public QueryRoom(room: Room): RoomManager {
        const data = this.rooms[room.name];
        return RoomManager.Create(room, data);
    }
}

function Set_toJSON(key: string, value: any) {
    if (typeof value === 'object' && value instanceof Set) {
        return [...value];
    }
    return value;
}
