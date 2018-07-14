import { Task } from "Constant";
import RoomManager from "game/RoomManager";

export abstract class TaskManager {
    constructor(protected roomManager: RoomManager) {
    }

    abstract RequestTask(creep: Creep): boolean
    abstract IsEmpty(): boolean;
}
