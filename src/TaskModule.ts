import { Task, State } from "Constant";
import { CreepMemoryExt, Cache, GameCache, Message, RoomTaskResult, MemoryExt, debug, } from "helper";
import { SourceHelper } from "helper/SourceHelper"
import { PositionHelper } from "helper/position";

type Process = { (room: Room, cache: Cache): boolean };
type Cache = { [id: string]: number };
type TaskTarget = Source | Structure | ConstructionSite | Resource;

export default class TaskModule {
    TargetCounter: Cache = {};

    constructor() {
        this.InitTargetCounter();
    }

    private InitTargetCounter(): void {
        for (const name in Game.creeps) {
            const creep = Game.creeps[name];
            const memory = creep.memory as CreepMemoryExt;

            const cache = this.TargetCounter;

            if (memory.State != undefined && memory.State != State.Idle) {
                const targetId = memory.StateTargetID;
                if (targetId != undefined) {
                    if (cache[targetId] == undefined) {
                        cache[targetId] = 1;
                    } else {
                        cache[targetId]++;
                    }
                }
            }
        }
    }

    Run(msg: Message) {
        for (const roomName in Game.rooms) {
            const room = Game.rooms[roomName];
            if (!IsMyRoom(room)) continue;

            Process_ExistedTasks(room, this.TargetCounter);

            const roomMsg: RoomTaskResult = {
                needMoreWorker: false,
                room: room,
            };

            const seq = this.GetProcessSequence();
            let process: Process | undefined;
            while (process = seq.shift()) {
                const result = process(room, this.TargetCounter);
                if (!result) {
                    console.log("----------- needMoreWorker ----------- ")
                    roomMsg.needMoreWorker = true;
                    break;
                }
            }
            msg.roomTaskResults.push(roomMsg);
        }
    }

    // 调度任务队列
    private GetProcessSequence(): Process[] {
        let seq: Process[] = [];
        seq.push(Process_MinimumUpgradeController);


        seq.push(Process_Pickup);
        seq.push(Process_MinimumHarvest);
        
        seq.push(Process_BestHarvest);
        seq.push(Process_BestBuild);
        seq.push(Process_BestUpgradeController);
        return seq;
    }
}

function Process_ExistedTasks(room: Room, cache: Cache): void {
    //console.log('Process_ExistedTasks:' + room.name); // DEBUG
    const roomCache = Cache.FindCache(room);

    for (const creep of roomCache.creeps) {
        const memory = creep.memory as CreepMemoryExt;
        const task = BaseCreateCreepTask(creep, cache, memory.Task);
        task.Run();
    }
}

function Process_MinimumUpgradeController(room: Room, cache: Cache): boolean {
    if (Memory.debug) console.log('Process_MinimumUpgradeController:' + room.name); // DEBUG
    if (CountTaskCreep(room, Task.UpgradeController) < 1) {
        const source = room.controller as StructureController;
        const creep = GetClosestIdleCreep(source);
        if (creep == null) return false;
        else {
            const task = CreateCreepTask(creep, cache, Task.UpgradeController, source);
            task.Run();
        }
    }

    return true;
}

function Process_Pickup(room: Room, cache: Cache): boolean {
    //console.log('Process_Pickup:' + room.name); // DEBUG
    const items = room.find(FIND_DROPPED_RESOURCES);
    for (var res of items) {
        if (cache[res.id] != undefined && cache[res.id] > 1)
            continue;
        let creep = GetClosestIdleCreep(res);
        if (creep == null) {
            console.log("Process_Pickup Result: " + false);
            return false;
        }

        const task = CreateCreepTask(creep, cache, Task.Pickup, res);
        task.Run();
    }

    console.log("Process_Pickup Result: " + true);
    return true;
}

function Process_MinimumHarvest(room: Room, cache: Cache): boolean {
    //console.log('Process_MinimumHarvest:' + room.name); // DEBUG
    if (CountTaskCreep(room, Task.Harvest) < 1) {
        const source = Cache.FindCache(room).sources[0];
        const creep = GetClosestIdleCreep(source);
        if (creep == null) return false;
        else {
            const task = CreateCreepTask(creep, cache, Task.Harvest, source);
            task.Run();
        }
    }

    return true;
}

function Process_BestHarvest(room: Room, cache: Cache): boolean {
    //console.log('Process_BestHarvest:' + room.name); // DEBUG
    const roomCache = Cache.FindCache(room);
    const memory = Memory as MemoryExt;
    let countWorkRate = 0;
    let expectRate = 0;
    let hasLongTeam = false;

    //let teamLengthMsg = "";
    for (const source of roomCache.sources) {
        expectRate += SourceHelper.CalcExpectRate(source);
        let sourcesMax = memory.sources[source.id].max;
        let usedRoom = cache[source.id] == undefined ? 0 : cache[source.id];
        let teamLength = (usedRoom - sourcesMax) / sourcesMax;
        //teamLengthMsg = teamLengthMsg.concat(source.id + " teamLength:" + teamLength + "| ");

        for (const creep of roomCache.creeps) {
            const memory = creep.memory as CreepMemoryExt;
            if (memory.StateTargetID != source.id) continue;;
            countWorkRate += SourceHelper.CalcHarvestRate(creep, source);

            hasLongTeam = hasLongTeam || (teamLength > Math.LOG10E);
        }
    }
    //const rateMsg = "IsBestHarvest WorkRate:" + countWorkRate.toPrecision(2) + " expectRate:" + expectRate.toPrecision(2) + " |" + (countWorkRate / expectRate).toPrecision(2);
    //debug.dlog("rateMsg", rateMsg);
    //debug.dlog("teamLengthMsg", teamLengthMsg);


    let result = expectRate == 0 || (countWorkRate / expectRate) > 1 || hasLongTeam;
    let creep = GetIdleCreepInRoom(room);

    while (!result && creep != null) {
        const source = RequestHarvestSource(creep, cache);
        const task = CreateCreepTask(creep, cache, Task.Harvest, source);
        task.Run();

        countWorkRate += SourceHelper.CalcHarvestRate(creep, source);
        creep = GetIdleCreepInRoom(room);

        let sourcesMax = memory.sources[source.id].max;
        let usedRoom = cache[source.id] == undefined ? 0 : cache[source.id];
        let teamLength = (usedRoom - sourcesMax) / sourcesMax;
        hasLongTeam = hasLongTeam || teamLength > Math.LOG10E;

        result = expectRate == 0 || (countWorkRate / expectRate) > 1 || hasLongTeam;
    }

    //if (!result) {
    //    console.log("expectRate==0 " + expectRate);
    //    console.log("(countWorkRate / expectRate > 1) " + countWorkRate / expectRate);
    //    console.log("hasLongTeam " + hasLongTeam);
    //}
    console.log("Process_BestHarvest Result: " + result);
    return result;
}

function Process_BestBuild(room: Room, cache: Cache): boolean {
    //console.log('Process_BestBuild:' + room.name); // DEBUG
    const structures = room.find(FIND_MY_CONSTRUCTION_SITES);
    if (structures.length == 0) {
        console.log("Process_BestBuild no structure:" + true); // DEBUG
        return true;
    }

    let creep = GetIdleCreepInRoom(room) as Creep;
    while (creep) {
        const structure = PositionHelper.GetClosestObject(creep.pos, structures) as ConstructionSite;
        const task = CreateCreepTask(creep, cache, Task.Build, structure);
        task.Run();

        creep = GetIdleCreepInRoom(room) as Creep;
    };
    
    if (creep == null && CountTaskCreep(room, Task.Build) < 1) {
        console.log('Process_BestBuild Builder < 1:' + room.name + " " + false); // DEBUG
        return false;
    }

    console.log('Process_BestBuild:' + room.name + " " + true); // DEBUG
    return true;
}

function Process_BestUpgradeController(room: Room, cache: Cache): boolean {
    //console.log('Process_BestUpgradeController:' + room.name); // DEBUG
    if (HasNotFullContainer(room)) {
        console.log('Process_BestUpgradeController HasNotFullContainer:' + true); // DEBUG
        return true;
    }

    const roomCache = Cache.FindCache(room);
    let expectRate = 0;

    for (const source of roomCache.sources) {
        expectRate += SourceHelper.CalcExpectRate(source);
    }

    let upgradeRate = 0;
    for (const creep of roomCache.creeps) {
        const memory = creep.memory as CreepMemoryExt;
        if (memory.Task != Task.UpgradeController) continue;
        upgradeRate += creep.getActiveBodyparts(WORK);
    }

    let creep = GetIdleCreepInRoom(room);
    let result = upgradeRate > expectRate;
    const target = room.controller as StructureController;
    while (!result && creep != null) {
        const task = CreateCreepTask(creep, cache, Task.UpgradeController, target);
        task.Run();
        upgradeRate += creep.getActiveBodyparts(WORK);

        creep = GetIdleCreepInRoom(room);
        result = upgradeRate >= expectRate;
    }

    console.log('Process_BestUpgradeController:' + result); // DEBUG
    return result;
}

export abstract class BaseCreepTask {
    protected readonly creep: Creep;
    protected stateTargetCounter: HashTable

    get State(): State {
        return (this.creep.memory as CreepMemoryExt).State;
    }

    set State(value: State) {
        (this.creep.memory as CreepMemoryExt).State = value;
    }

    set StateTarget(value: Source | Structure | ConstructionSite | Resource) {
        const memory = (this.creep.memory as CreepMemoryExt);
        const cache = this.stateTargetCounter;
        const oldTarget = memory.StateTargetID;

        if (oldTarget != undefined && cache[oldTarget] != undefined)
            cache[oldTarget] -= 1;

        if (cache[value.id] == undefined)
            cache[value.id] = 0;
        else cache[value.id] += 1;

        (this.creep.memory as CreepMemoryExt).StateTargetID = value.id;
    }

    get StateTarget(): Source | Structure | ConstructionSite | Resource {
        let stateTargetID = (this.creep.memory as CreepMemoryExt).StateTargetID;
        return Game.getObjectById(stateTargetID) as Source | Structure | ConstructionSite | Resource;
    }

    get Task(): Task {
        return (this.creep.memory as CreepMemoryExt).Task;
    }

    set Task(value: Task) {
        (this.creep.memory as CreepMemoryExt).Task = value;
    }

    get TaskTarget(): Source | Structure | ConstructionSite | Resource {
        let taskTargetID = (this.creep.memory as CreepMemoryExt).TaskTargetID;
        return Game.getObjectById(taskTargetID) as Structure | Source;
    }

    set TaskTarget(value: Source | Structure | ConstructionSite | Resource) {
        (this.creep.memory as CreepMemoryExt).TaskTargetID = value.id;
    }

    ClearTask(): void {
        const memory = (this.creep.memory as CreepMemoryExt);
        const cache = this.stateTargetCounter;
        const oldTarget = memory.StateTargetID;
        if (oldTarget != undefined && cache[oldTarget] != undefined)
            cache[oldTarget] -= 1;

        delete memory.Task;
        delete memory.State;
        delete memory.StateTargetID;
        delete memory.TaskTargetID;
    }

    constructor(creep: Creep, stateTargetCounter: Cache) {
        this.creep = creep;
        this.stateTargetCounter = stateTargetCounter;
    }

    abstract Run(): void;
}

function GetClosestDropped(from: Creep): Resource | null {
    throw "未实现";
}

function GetClosestIdleCreep(from: TaskTarget): Creep | null {
    const creeps: Creep[] = [];
    for (const name in Game.creeps) {
        const creep = Game.creeps[name];
        if (creep.spawning) continue;
        let memory = creep.memory as CreepMemoryExt;
        if (memory.Task == undefined || memory.State == State.Idle)
            creeps.push(creep);
    }
    return PositionHelper.GetClosestObject(from.pos, creeps) as Creep | null;
}

function GetIdleCreepInRoom(room: Room): Creep | null {
    const cache = Cache.FindCache(room);
    const creeps: Creep[] = [];
    for (const creep of cache.creeps) {
        if (creep.spawning) continue;

        const memory = creep.memory as CreepMemoryExt;
        if (memory.Task == undefined || memory.State == State.Idle)
            return creep;
    }
    return null;
}

function CreateCreepTask(creep: Creep, stateTargetCounter: Cache, task: Task, tasktarget: TaskTarget): BaseCreepTask {
    const memory = creep.memory as CreepMemoryExt;
    const obj = BaseCreateCreepTask(creep, stateTargetCounter, task);
    obj.ClearTask();

    obj.Task = task;
    obj.TaskTarget = tasktarget;
    return obj;
}

function BaseCreateCreepTask(creep: Creep, stateTargetCounter: Cache, task: Task) {
    let obj: BaseCreepTask;
    switch (task) {
        case Task.Harvest:
            obj = new HarvestTask(creep, stateTargetCounter);
            break;
        case Task.UpgradeController:
            obj = new UpgradeControllerTask(creep, stateTargetCounter);
            break;
        case Task.Build:
            obj = new BuildTask(creep, stateTargetCounter);
            break;
        case Task.Pickup:
            obj = new PickupTask(creep, stateTargetCounter);
            break;
        case Task.None:
        default:
            obj = new NoneTask(creep, stateTargetCounter);
            break;
    }
    return obj;
}

function IsMyRoom(room: Room) {
    return room.controller != null && room.controller.my;
}

function IsSourceEmpty(source: Source): boolean {
    return source.energy == 0 && source.ticksToRegeneration > 15;
}

function IsTargetFull(target: AnyStructure): boolean {
    switch (target.structureType) {
        case STRUCTURE_SPAWN:
        case STRUCTURE_EXTENSION:
        case STRUCTURE_TOWER:
            return target.energy == target.energyCapacity;
        case STRUCTURE_CONTAINER:
        case STRUCTURE_STORAGE:
            return _.sum(target.store) == target.storeCapacity;
    }
    return true;
}

function IsCreepFull(creep: Creep): boolean {
    return _.sum(creep.carry) == creep.carryCapacity;
}

function IsCreepEmpty(creep: Creep): boolean {
    return _.sum(creep.carry) == 0;
}

function GetClosestNotFullContainer(creep: Creep): Structure | null {
    return PositionHelper.GetClosestNotFullContainer(creep.pos);
}

function HasNotFullContainer(room: Room): boolean {
    const structures = room.find(FIND_STRUCTURES);

    for (const structure of structures) {
        switch (structure.structureType) {
            case STRUCTURE_SPAWN:
            case STRUCTURE_EXTENSION:
            case STRUCTURE_TOWER:
                if (structure.energy < structure.energyCapacity)
                    return true;
                break;
            case STRUCTURE_CONTAINER:
            case STRUCTURE_STORAGE:
                if (_.sum(structure.store) < structure.storeCapacity)
                    return true;
        }
    }
    return false;
}

function GetClosestNotEmptyContainer(creep: Creep): Structure | null {
    const arrContainerStorage = [];
    const structures = creep.room.find(FIND_STRUCTURES);
    for (const structure of structures) {
        switch (structure.structureType) {
            case STRUCTURE_CONTAINER:
            case STRUCTURE_STORAGE:
                if (structure.store.energy == 0)
                    continue;
                arrContainerStorage.push(structure); break;
        }
    }
    let obj = PositionHelper.GetClosestObject(creep.pos, arrContainerStorage);
    if (obj) return obj as Structure;
    else return null
}

function RequestHarvestSource(creep: Creep, counter: Cache): Source {
    return SourceHelper.FindHarvestSourceFor(creep, counter);
}

function CountTaskCreep(room: Room, task: Task) {
    const cache = Cache.FindCache(room);
    let count = 0;
    const creeps = Game.creeps;
    for (const creep of cache.creeps) {
        if ((creep.memory as CreepMemoryExt).Task == task)
            count += 1;
    }
    return count;
}

function GetClosestConstructionSite(creep: Creep): ConstructionSite | null {
    const structures = creep.room.find(FIND_MY_CONSTRUCTION_SITES);
    let obj = PositionHelper.GetClosestObject(creep.pos, structures);
    if (obj) return obj as ConstructionSite;
    else return null
}

function IsConstructionSite(structure: Structure): boolean {
    return structure instanceof ConstructionSite;
}

class NoneTask extends BaseCreepTask {
    constructor(creep: Creep, stateTargetCounter: Cache) {
        super(creep, stateTargetCounter);
    }

    Run() {
        const memory = this.creep.memory as CreepMemoryExt;
        if (memory.debug) console.log('PROCESS CREEP NoneTask:' + this.creep.name); // DEBUG

        this.State = State.Idle;
    }
}

class HarvestTask extends BaseCreepTask {
    constructor(creep: Creep, stateTargetCounter: Cache) {
        super(creep, stateTargetCounter);
    }

    Run() {
        let memory = this.creep.memory as CreepMemoryExt;
        let state = this.State;
        let creep = this.creep;
        if (memory.debug) console.log('PROCESS HarvestTask:' + creep.name); // DEBUG

        switch (state) {
            default:
                if (memory.debug) console.log('PROCESS Harvest Task State:' + state + ' ' + creep.name);// DEBUG
                this.State = State.Harvest;
                this.StateTarget = this.TaskTarget;
                break;
            case State.Harvest:
                if (memory.debug) console.log('STATE_HARVEST');// DEBUG
                let source = this.TaskTarget as Source;
                if (this.TaskTarget == null)
                    console.log(creep.name);
                if (IsCreepFull(creep) || IsSourceEmpty(source)) {
                    let obj = GetClosestNotFullContainer(creep);
                    if (obj) {
                        this.State = State.Transfer;
                        this.StateTarget = obj;
                    } else {
                        this.State = State.Idle;
                    }
                }
                break;
            case State.Transfer:
                if (memory.debug) console.log('STATE_TRANSFER');// DEBUG
                if (!IsCreepEmpty(creep)) {
                    if (IsTargetFull(this.StateTarget as AnyStructure)) {
                        const obj = GetClosestNotFullContainer(creep);
                        if (obj) {
                            this.StateTarget = obj;
                        }
                    }
                    break;
                }
                this.State = State.Idle;
                break;
            case State.Idle:
                if (memory.debug) console.log('STATE_IDLE');// DEBUG
        }
    }
}

class UpgradeControllerTask extends BaseCreepTask {
    constructor(creep: Creep, stateTargetCounter: Cache) {
        super(creep, stateTargetCounter);
    }

    Run() {
        let memory = this.creep.memory as CreepMemoryExt;
        let state = this.State;
        let creep = this.creep;
        let counter = this.stateTargetCounter;
        if (memory.debug) console.log('PROCESS CREEP runUpgradeControllerTask:' + creep.name);// DEBUG

        switch (state) {
            default:
                if (memory.debug) console.log('PROCESS UpgradeController Task State:' + state + ' ' + creep.name);// DEBUG
                let obj = GetClosestNotEmptyContainer(creep);
                if (obj) {
                    this.State = State.Withdraw;
                    this.StateTarget = obj;
                } else {
                    this.State = State.Harvest;
                    let obj = RequestHarvestSource(creep, counter);
                    this.StateTarget = obj;
                }
                break;
            case State.Withdraw:
                if (memory.debug) console.log('STATE_WITHDRAW');// DEBUG
                if (IsCreepFull(creep)) {
                    this.State = State.UpgradeController;
                    this.StateTarget = this.TaskTarget;
                } else {
                    let obj = GetClosestNotEmptyContainer(creep);
                    if (obj) {
                        this.StateTarget = obj;
                    } else {
                        this.State = State.Harvest;
                        let obj = RequestHarvestSource(creep, counter);
                        this.StateTarget = obj;
                    }
                }
                break;
            case State.Harvest:
                if (memory.debug) console.log('STATE_HARVEST');// DEBUG
                let source = this.StateTarget as Source;
                if (IsCreepFull(creep) || IsSourceEmpty(source)) {
                    this.State = State.UpgradeController;
                    this.StateTarget = this.TaskTarget;
                }
                break;
            case State.UpgradeController:
                if (memory.debug) console.log('STATE_UPGRADE_CONTROLLER');// DEBUG
                if (IsCreepEmpty(creep)) {
                    this.State = State.Idle;
                }
                break;
            case State.Idle:
                if (memory.debug) console.log('STATE_IDLE');// DEBUG
        }
    }
}

class TransferTask extends BaseCreepTask {
    constructor(creep: Creep, stateTargetCounter: Cache) {
        super(creep, stateTargetCounter);
    }

    Run() {
        throw "未实现";
    }
}

class BuildTask extends BaseCreepTask {
    constructor(creep: Creep, stateTargetCounter: Cache) {
        super(creep, stateTargetCounter);
    }

    Run() {
        let memory = this.creep.memory as CreepMemoryExt;
        let state = this.State;
        let creep = this.creep;
        let counter = this.stateTargetCounter;
        if (memory.debug) console.log('PROCESS BuildTask:' + creep.name); // DEBUG

        switch (state) {
            default:
                if (memory.debug) console.log('PROCESS BuildTask Task State:' + state + ' ' + creep.name);// DEBUG
                let obj = GetClosestNotEmptyContainer(creep);
                if (obj) {
                    this.State = State.Withdraw;
                    this.StateTarget = obj;
                } else {
                    this.State = State.Harvest;
                    let obj = RequestHarvestSource(creep, counter);
                    this.StateTarget = obj;
                }
                break;
            case State.Withdraw:
                if (memory.debug) console.log('STATE_WITHDRAW');// DEBUG
                if (IsCreepFull(creep)) {
                    this.State = State.Build;
                    this.StateTarget = this.TaskTarget;
                } else {
                    let obj = GetClosestNotEmptyContainer(creep);
                    if (obj) {
                        this.StateTarget = obj;
                    } else {
                        this.State = State.Harvest;
                        let obj = RequestHarvestSource(creep, counter);
                        this.StateTarget = obj;
                    }
                }
                break;
            case State.Harvest:
                if (memory.debug) console.log('STATE_HARVEST');// DEBUG
                if (IsCreepFull(creep) || IsSourceEmpty(this.StateTarget as Source)) {
                    if (this.TaskTarget && IsConstructionSite(this.TaskTarget as Structure)) {
                        this.State = State.Build;
                        this.StateTarget = this.TaskTarget;
                    } else {
                        this.State = State.Idle;
                    }
                }
                break;
            case State.Build:
                if (memory.debug) console.log('STATE_UPGRADE_CONTROLLER');// DEBUG
                if (IsCreepEmpty(creep) || !IsConstructionSite(this.StateTarget as Structure)) {
                    this.State = State.Idle;
                }
                break;
            case State.Idle:
                if (memory.debug) console.log('STATE_IDLE');// DEBUG
        }
    }
}

class PickupTask extends BaseCreepTask {
    constructor(creep: Creep, stateTargetCounter: Cache) {
        super(creep, stateTargetCounter);
    }

    Run() {
        let memory = this.creep.memory as CreepMemoryExt;
        let state = this.State;
        let creep = this.creep;
        let counter = this.stateTargetCounter;
        if (memory.debug) console.log('PROCESS PickupTask:' + creep.name); // DEBUG

        switch (state) {
            default:
                if (memory.debug) console.log('PROCESS BuildTask Task State:' + state + ' ' + creep.name);// DEBUG
                this.State = State.Pickup;
                this.StateTarget = this.TaskTarget;
                break;
            case State.Pickup:
                if (memory.debug) console.log('STATE_HARVEST');// DEBUG
                let source = this.TaskTarget as Source;
                if (IsCreepFull(creep) || (source == null)) {
                    let obj = GetClosestNotFullContainer(creep);
                    if (obj) {
                        this.State = State.Transfer;
                        this.StateTarget = obj;
                    } else {
                        this.State = State.Idle;
                    }
                }
                break;
            case State.Transfer:
                if (memory.debug) console.log('STATE_TRANSFER');// DEBUG
                if (!IsCreepEmpty(creep)) {
                    if (IsTargetFull(this.StateTarget as AnyStructure)) {
                        const obj = GetClosestNotFullContainer(creep);
                        if (obj) {
                            this.StateTarget = obj;
                        }
                    }
                    break;
                }
                this.State = State.Idle;
                break;
            case State.Idle:
                if (memory.debug) console.log('STATE_IDLE');// DEBUG
        }
    }
}
