import { ProcessResult } from "process/ProcessResult ";

export default abstract class BaseProcess {
    protected room: Room;
    protected cache: HashTable;

    constructor(room: Room, cache: HashTable) {
        this.room = room;
        this.cache = cache;
    }

    abstract Run(): ProcessResult
}
