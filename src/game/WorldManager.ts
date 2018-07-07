import RoomManager from "./RoomManager";
import RoomData from "./RoomData";

export default class WorldManager {
    private static entity: WorldManager;
    static get Entity() {
        if (WorldManager.entity == undefined)
            WorldManager.entity = new WorldManager();

        return WorldManager.entity;
    }

    private rooms: RoomData[];
    private roomData: { [name: string]: RoomData };

    private constructor() {
        this.rooms = [];
        this.roomData = {};
    }

    public ScanRooms() {
        const rooms = Game.rooms

        for (const n in rooms) {
            const room: Room = rooms[n];

            if (this.roomData[room.name] == undefined) {
                const roomData = new RoomData(room);
                this.rooms.push(roomData);
                this.roomData[room.name] = roomData;
            }
        }
    }

    public QueryRoom(room: Room): RoomManager {
        const data = this.roomData[room.name];
        return RoomManager.Create(room, data);
    }
}
