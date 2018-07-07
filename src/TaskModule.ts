import { Task } from "Constant";
import WorldManager from "game/WorldManager";

type TaskProcess = { (room: Room): Boolean }

export default class TaskModule {
    constructor() { }
    Run() {
        for (const roomName in Game.rooms) {
            const room = Game.rooms[roomName];
            if (room.controller == null || !room.controller.my) continue;

            this.InitDroppedResources(room);
            this.InitCreepArray(room);
            this.InitSources(room);
            this.InitBaseBuildings(room)
            this.InitTowers(room);
            this.InitConstructionSites(room);
            this.InitBrokenStructures(room);
            this.InitStores(room);

            this.Check_ExistedTasks(room);

            const seq = this.GetProcessSequence();
            let process: TaskProcess | undefined;
            while (process = seq.shift()) {
                const result = process(room);
            }
        }
    }

    // 调度任务队列
    private GetProcessSequence(): TaskProcess[] {
        let seq: TaskProcess[] = [];
        seq.push(TaskProcess_MinimumUpgradeController); //1
        //seq.push(TaskProcess_Pickup); //2
        seq.push(TaskProcess_Harvest); //3
        seq.push(TaskProcess_FillBase); //4
        //seq.push(TaskProcess_FillTower); //5
        //seq.push(TaskProcess_WithdrawEnergy); //6
        //seq.push(TaskProcess_Build); //7
        //seq.push(TaskProcess_Repair); //8
        //seq.push(TaskProcess_FillStore); //9
        //seq.push(TaskProcess_UpgradeController); //10

        return seq;
    }
}

function GetClosestObject<T extends RoomObject>(from: RoomPosition, arr: T[]): T {
    let best: T | undefined;
    let bestPL: Number = Number.MAX_VALUE;

    for (const obj of arr) {
        const pathLength = from.findPathTo(obj).length;
        if (best == undefined) {
            best = obj;
            bestPL = pathLength;
        } else if (pathLength < bestPL) {
            best = obj;
            bestPL = pathLength;
        }
    }

    return best as T;
}

function TaskProcess_MinimumUpgradeController(room: Room): Boolean {
    if (Memory.debug) console.log('TaskProcess_MinimumUpgradeController:' + room.name); // DEBUG
    const rm = WorldManager.Entity.QueryRoom(room);

    if (!rm.HasNotEmptyCreep()) return false;
    if (!rm.NotUpgradeControllerTask()) return true;

    const controller = room.controller as StructureController;
    const creep = GetClosestObject(controller.pos, rm.GetIdleNotEmptyCreeps());
    rm.SetTask(creep, Task.Harvest, controller);

    return true;
}

function TaskProcess_Harvest(room: Room): Boolean {
    if (Memory.debug) console.log('TaskProcess_Harvest:' + room.name); // DEBUG
    const rm = WorldManager.Entity.QueryRoom(room);

    const roomCache = GameCache.Room[room.name];
    const cacheData = roomCache.Data;

    if (!rm.HasEmptyCreep()) return false;
    if (!rm.HasHarvestRoom()) return true;

    do {
        const creep = cacheData.CreepsIdleEmpty.shift() as Creep;

        //const source = SourceHelper.FindHarvestSourceFor(creep, cache.TargetCounter);
        const source = GetClosestObject(creep.pos, cacheData.Sources);
        SetTask(creep, Task.Harvest, source, cacheData);
        RemoveObject(creep, cacheData.CreepsIdleEmpty);

        const sourceData = cacheData.SourcesData[source.id];

        sourceData.FreeRoom -= 1;
        const memory = Memory as MemoryExt;
        const max = memory.sources[source.id].max;
        const teamLength = SourceHelper.CalcTeamLength(max - sourceData.FreeRoom, max);

        const hasLongTeam = SourceHelper.IsLongTeam(teamLength)
        if (!hasLongTeam) {
            sourceData.RemainingRate -= SourceHelper.CalcHarvestRate(creep, source);
            if (sourceData.RemainingRate > 0) {
                continue;
            }
        }

        RemoveObject(source, cacheData.Sources);
        if (cacheData.Sources.length == 0) return true;

    } while (cacheData.CreepsIdleEmpty.length > 0);

    return cacheData.Sources.length == 0;
}
