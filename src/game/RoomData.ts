import { MemoryExt, CreepMemoryExt, GetGameObjects } from "helper";
import { SourceHelper } from "helper/SourceHelper";
import { Task } from "Constant";
import SourceData from "./SourceData";
import GameSet from "helper/Set";
import { IMediator, IMessage } from "GameObject/Mediator";
import StructureData from "./StructureData";

export default class RoomData {
    name: string;
    taskCounter: { [id: string]: Set<string> };
    taskTargetCounter: { [id: string]: { [task: number]: Set<string> } };

    creeps: Set<string>;
    idleEmptyCreeps: Set<string>;
    idleNotEmptyCreeps: Set<string>;

    spawnRelateds: Set<string>;
    noFullSpawnRelateds: Set<string>;

    structures: Set<string>;

    sources: HashTable<SourceData>;
    canHarvestSources: Set<string>;

    constructor(room: Room) {
        if (room == null)
            throw new Error("room == null");

        this.name = room.name;

        this.spawnRelateds = new Set();
        this.noFullSpawnRelateds = new Set();
        this.structures = new Set();
        this.initStructures(room);

        this.creeps = new Set();
        this.idleEmptyCreeps = new Set();
        this.idleNotEmptyCreeps = new Set();
        this.taskCounter = {};
        this.taskTargetCounter = {};
        this.initCreeps(room);

        this.sources = {};
        this.canHarvestSources = new Set();
        this.initSources(room);
    }

    // Structure

    private initStructure(structure: AnyStructure) {
        this.structures.add(structure.id);
    }

    private updateSpawnRelateds(structure: AnyStructure) {
        switch (structure.structureType) {
            case STRUCTURE_SPAWN:
            case STRUCTURE_EXTENSION:
                this.spawnRelateds.add(structure.id);

                let sumTransfer = 0;
                const transfer: Creep[] = [];
                const dict = this.taskTargetCounter[structure.id];
                if (dict) {
                    const set = dict[Task.Transfer];
                    if (set) {
                        set.forEach(id => {
                            const creep = Game.getObjectById<Creep>(id);
                            if (creep) {
                                const memory = creep.memory as CreepMemoryExt;
                                if (memory.Task == Task.Transfer)
                                    transfer.push(creep);
                            }
                        });
                    }
                }

                for (const creep of transfer) {
                    sumTransfer += creep.carry.energy;
                }

                if (structure.energyCapacity > structure.energy + sumTransfer)
                    this.noFullSpawnRelateds.add(structure.id);
                else
                    this.noFullSpawnRelateds.delete(structure.id);
        }
    }

    private initStructures(room: Room) {
        const structures = room.find(FIND_STRUCTURES)
        for (const structure of structures) {
            this.initStructure(structure);
            this.updateSpawnRelateds(structure);
        }
    }

    updateStructures(room: Room) {
        const structures = room.find(FIND_STRUCTURES)

        for (const structure of structures) {
            if (this.structures.has(structure.id)) {
                this.initStructure(structure);
                this.updateSpawnRelateds(structure);
            }
        }

        for (const id of Object.keys(this.structures)) {
            const structure = Game.getObjectById<AnyStructure>(id);
            if (structure == null) {
                this.structures.delete(id);
                this.noFullSpawnRelateds.delete(id);
            }
        }
    }

    updateStructure(structure: AnyStructure) {
        this.updateSpawnRelateds(structure);
    }

    // Creep

    updateCreep(creep: Creep) {
        const creepMemory = creep.memory as CreepMemoryExt;
        if (creepMemory.Task == Task.Idle) {
            if (_.sum(creep.carry) == 0) this.idleEmptyCreeps.add(creep.id);//init idleEmptyCreeps 
            else this.idleNotEmptyCreeps.add(creep.id);//init idleNotEmptyCreeps
        }
    }

    removeCreep(creepId: string) {
        this.removeCreepFromCounter(creepId);

        const creepMemory = Memory.creeps[creepId] as CreepMemoryExt;
        if (creepMemory.Task == Task.Idle) {
            this.idleEmptyCreeps.delete(creepId);//update idleEmptyCreeps 
            this.idleNotEmptyCreeps.add(creepId);//update idleNotEmptyCreeps
        }
        delete Memory.creeps[creepId];
    }

    private initCreeps(room: Room) {
        const creeps = room.find(FIND_CREEPS)

        for (const creep of creeps) {
            if (creep.spawning) continue;
            if (creep.my) {
                this.updateCreep(creep);
                this.addCreepToCounter(creep);
            }
            this.creeps.add(creep.id);
        }
    }

    updateCreeps(room: Room) {
        const creeps = room.find(FIND_CREEPS)
        const targetCounter = this.taskTargetCounter;
        const taskCounter = this.taskCounter;

        for (const creep of creeps) {
            if (creep.spawning) continue;

            if (!this.creeps.has(creep.id)) {
                if (creep.my) {
                    this.updateCreep(creep);
                    this.addCreepToCounter(creep);
                }
                this.creeps.add(creep.id);
            }
        }

        for (const id of this.creeps.values()) {
            const creep = Game.getObjectById<Creep>(id);
            if (creep == null) {
                this.removeCreep(id);
                this.creeps.delete(id);
            }
        }
    }

    addCreepToCounter(creep: Creep) {
        const targetCounter = this.taskTargetCounter;
        const taskCounter = this.taskCounter;
        const creepMemory = creep.memory as CreepMemoryExt;

        const targetId = creepMemory.TaskTargetID;
        const task = creepMemory.Task;

        //set taskTargetCounter
        if (targetId != undefined) {
            if (targetCounter[targetId] == undefined) {
                targetCounter[targetId] = {};
            }
            if (targetCounter[targetId][task] == undefined) {
                targetCounter[targetId][task] = new Set();
            }

            targetCounter[targetId][task].add(creep.id);
        }

        if (creepMemory.Task == undefined) {
            creepMemory.Task = Task.Idle;
        }

        //set taskCounter
        if (taskCounter[task] == undefined) {
            taskCounter[task] = new Set()
        }
        taskCounter[task].add(creep.id);
    }

    removeCreepFromCounter(creepId: string) {
        const targetCounter = this.taskTargetCounter;
        const taskCounter = this.taskCounter;

        const creepMemory = Memory.creeps[creepId] as CreepMemoryExt;
        if (creepMemory == undefined)
            return;

        const targetId = creepMemory.TaskTargetID;
        const task = creepMemory.Task;

        //set taskTargetCounter
        if (targetId != undefined) {
            if (targetCounter[targetId] != undefined
                && targetCounter[targetId][task] != undefined) {
                targetCounter[targetId][task].delete(creepId);
            }
        }

        //set taskCounter
        if (taskCounter[task] != undefined) {
            taskCounter[task].delete(creepId);
        }
    }

    // Source

    updateCanHarvestSources(source: Source) {
        const harvest: Creep[] = [];
        const dict = this.taskTargetCounter[source.id];
        if (dict) {
            const set = dict[Task.Harvest];
            if (set) {
                set.forEach(id => {
                    const creep = Game.getObjectById<Creep>(id);
                    if (creep) {
                        const memory = creep.memory as CreepMemoryExt;
                        if (memory.Task == Task.Harvest)
                            harvest.push(creep);
                    }
                });
            }
        }

        let sourceExpectRate = SourceHelper.CalcExpectRate(source);
        for (const creep of harvest) {
            const creepMemory = creep.memory as CreepMemoryExt;
            sourceExpectRate -= SourceHelper.CalcHarvestRate(creep);
        }

        const data = this.sources[source.id];
        if (harvest.length < data.maxRoom && sourceExpectRate > 0) {
            this.canHarvestSources.add(source.id);
        }
    }

    private initSource(source: Source) {
        const data = new SourceData(source);
        this.sources[source.id] = data;
    }

    private initSources(room: Room) {
        const counter = this.taskTargetCounter;
        const sources = room.find(FIND_SOURCES);

        for (const source of sources) {
            this.initSource(source);
            this.updateCanHarvestSources(source);
        }
    }

    updateSources(room: Room) {
        const counter = this.taskTargetCounter;
        const sources = room.find(FIND_SOURCES);

        for (const source of sources) {
            if (counter[source.id] == undefined) {
                this.initSource(source);
                this.updateCanHarvestSources(source);
            }
        }
    }

    updateSource(source: Source) {
        this.updateCanHarvestSources(source);
    }


}
