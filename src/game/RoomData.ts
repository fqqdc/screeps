import { MemoryExt, CreepMemoryExt, GetGameObjects } from "helper";
import { SourceHelper } from "helper/SourceHelper";
import { Task } from "Constant";
import SourceData from "./SourceData";

export default class RoomData {
    name: string;
    taskCounter: HashTable;
    taskTargetCounter: HashTable;

    creeps: string[];
    idleEmptyCreeps: string[];
    idleNotEmptyCreeps: string[];

    spawns: string[];
    extensions: string[];
    noFullSpawnRelateds: string[];

    structures: string[];
    structureData: { [name: string]: StructureData };

    sources: string[];
    sourceData: { [name: string]: SourceData };
    canHarvestSources: string[];

    constructor(room: Room) {
        if (room == null)
            throw "room == null";

        this.name = room.name;

        this.spawns = [];
        this.extensions = [];
        this.noFullSpawnRelateds = [];
        this.structures = [];
        this.structureData = {};
        this.initStructures(room);

        this.creeps = [];
        this.idleEmptyCreeps = [];
        this.idleNotEmptyCreeps = [];
        this.taskCounter = {};
        this.taskTargetCounter = {};
        this.initCountersCreeps(room);

        this.sources = [];
        this.canHarvestSources = [];
        this.sourceData = {};
        this.initSources(room, this.creeps);
    }

    initStructures(room: Room) {
        const structures = room.find(FIND_STRUCTURES)
        for (const structure of structures) {
            switch (structure.structureType) {
                case STRUCTURE_SPAWN:
                    this.spawns.push(structure.id);
                    if (structure.energyCapacity > structure.energy)
                        this.noFullSpawnRelateds.push(structure.id);
                    break;
                case STRUCTURE_EXTENSION:
                    this.extensions.push(structure.id);
                    if (structure.energyCapacity > structure.energy)
                        this.noFullSpawnRelateds.push(structure.id);
                    break;
            }

            this.structures.push(structure.id);
            this.structureData[structure.id] = new StructureData();
        }
    }

    initCountersCreeps(room: Room) {
        const creeps = room.find(FIND_CREEPS)
        const targetCounter = this.taskTargetCounter;
        const taskCounter = this.taskCounter;

        for (const creep of creeps) {
            if (creep.spawning) continue;

            const creepMemory = creep.memory as CreepMemoryExt;
            if (creep.my) {

                const targetId = creepMemory.TaskTargetID;
                //init taskTargetCounter
                if (targetId != undefined) {
                    if (targetCounter[targetId] == undefined) {
                        targetCounter[targetId] = 1;
                    } else {
                        targetCounter[targetId] += 1;
                    }
                }

                if (creepMemory.Task == undefined) {
                    creepMemory.Task = Task.Idle;
                }
                const task = creepMemory.Task;
                //init taskCounter
                if (taskCounter[task] == undefined) {
                    taskCounter[task] = 1
                } else {
                    taskCounter[task] += 1
                }

                if (creepMemory.Task == Task.Idle) {
                    if (_.sum(creep.carry) == 0) this.idleEmptyCreeps.push(creep.id);//init idleEmptyCreeps 
                    else this.idleNotEmptyCreeps.push(creep.id);//init idleNotEmptyCreeps
                }
            }

            this.creeps.push(creep.id);
        }
    }

    initSources(room: Room, creepIds: string[]) {
        const counter = this.taskTargetCounter;
        const sources = room.find(FIND_SOURCES);

        for (const source of sources) {
            const data = new SourceData();
            let sourceExpectRate = SourceHelper.CalcExpectRate(source);
            data.maxRoom = SourceHelper.CalcHarvestRoom(source);            

            if (counter[source.id] == undefined) {
                this.sources.push(source.id);
                this.canHarvestSources.push(source.id);
                this.sourceData[source.id] = data;
                continue;
            }

            for (const creep of GetGameObjects<Creep>(creepIds)) {
                const creepMemory = creep.memory as CreepMemoryExt;
                if (creepMemory.TaskTargetID != source.id) continue;

                data.workers.push(creep.id);
                sourceExpectRate -= SourceHelper.CalcHarvestRate(creep);
            }

            if (data.workers.length < data.maxRoom && sourceExpectRate > 0) {
                this.canHarvestSources.push(source.id);
            }

            this.sources.push(source.id);
            this.sourceData[source.id] = data;
        }
    }
}
