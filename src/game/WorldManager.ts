import RoomManager from "./RoomManager";
import RoomData from "./RoomData";

export default class WorldManager {
    private static entity: WorldManager;
    static get Entity() {
        if (WorldManager.entity == undefined)
            WorldManager.entity = new WorldManager();

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
            }
        }
    }

    public QueryRoom(room: Room): RoomManager {
        const data = this.rooms[room.name];
        return RoomManager.Create(room, data);
    }
}
