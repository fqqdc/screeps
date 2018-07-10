import { MemoryExt, CreepMemoryExt, GetGameObjects, debug } from "helper";
import { SourceHelper } from "helper/SourceHelper";
import { Task } from "Constant";
import SourceData from "./SourceData";
import GameSet from "helper/Set";
import StructureData from "./StructureData";

export default class RoomData {
    name: string;
    taskCounter: { [id: string]: Set<string> };
    taskTargetCounter: { [id: string]: { [task: string]: Set<string> } };

    creeps: HashTable<string>;
    idleEmptyCreeps: Set<string>;
    idleHasEnergyCreeps: Set<string>;
    idleNotEmptyCreeps: Set<string>;

    constructionSites: Set<string>;

    noFullSpawnRelateds: Set<string>;
    noFullTowers: Set<string>;
    noFullStorages: Set<string>;
    noEmptyStorages: Set<string>;
    brokenStructures: Set<string>;
    structures: Set<string>;

    sources: HashTable<SourceData>;
    canHarvestSources: Set<string>;

    resources: Set<string>;
    canPickupResources: Set<string>;

    constructor(room: Room) {
        if (room == null)
            throw new Error("room == null");

        this.name = room.name;

        this.creeps = {}
        this.idleEmptyCreeps = new Set();
        this.idleHasEnergyCreeps = new Set();
        this.idleNotEmptyCreeps = new Set();
        this.taskCounter = {};
        this.taskTargetCounter = {};
        this.initCreeps(room);

        this.noFullSpawnRelateds = new Set();
        this.noFullTowers = new Set();
        this.noFullStorages = new Set();
        this.noEmptyStorages = new Set();
        this.brokenStructures = new Set();
        this.structures = new Set();
        this.initStructures(room);

        this.sources = {};
        this.canHarvestSources = new Set();
        this.initSources(room);

        this.constructionSites = new Set();
        this.initConstructionSites(room);

        this.resources = new Set();
        this.canPickupResources = new Set();
        this.initResources(room);
    }

    private countTaskAmount(obj: HasId, t: Task) {
        const creeps = [];
        const dict = this.taskTargetCounter[obj.id];
        if (dict) {
            const set = dict[t];
            if (set) {
                for (var id of set) {
                    const creep = Game.getObjectById<Creep>(id);
                    if (creep) {
                        const memory = creep.memory as CreepMemoryExt;
                        creeps.push(creep);
                    }
                }
            }
        }

        let sum = 0;
        for (const creep of creeps) {
            switch (t) {
                case Task.Transfer:
                    sum += _.sum(creep.carry); break;
                case Task.Withdraw:
                    sum += creep.carryCapacity - _.sum(creep.carry); break;
                case Task.Repair:
                    sum += creep.getActiveBodyparts(WORK) * 100 * creep.carry.energy; break;
                case Task.Pickup:
                    sum += creep.carryCapacity - _.sum(creep.carry); break;
            }
        }

        return sum;
    }

    // Structure
    private groupingStructure(structure: AnyStructure) {
        const sumRepair = this.countTaskAmount(structure, Task.Pickup);
        if (structure.hitsMax * 0.85 > structure.hits + sumRepair) {
            this.brokenStructures.add(structure.id);
        } else {
            this.brokenStructures.delete(structure.id);
        }

        const sumTransfer = this.countTaskAmount(structure, Task.Transfer);
        const sumWithdraw = this.countTaskAmount(structure, Task.Withdraw);
        switch (structure.structureType) {
            case STRUCTURE_SPAWN:
            case STRUCTURE_EXTENSION:
                if (structure.energyCapacity > structure.energy + sumTransfer)
                    this.noFullSpawnRelateds.add(structure.id);
                else
                    this.noFullSpawnRelateds.delete(structure.id);
                break;
            case STRUCTURE_TOWER:
                if (structure.energyCapacity > structure.energy + sumTransfer)
                    this.noFullTowers.add(structure.id);
                else
                    this.noFullTowers.delete(structure.id);
                break;
            case STRUCTURE_STORAGE:
            case STRUCTURE_CONTAINER:
                if (structure.storeCapacity > _.sum(structure.store) + sumTransfer) {
                    this.noFullStorages.add(structure.id);
                } else {
                    this.noFullStorages.delete(structure.id);
                }
                if (structure.store.energy - sumWithdraw > 0) {
                    this.noEmptyStorages.add(structure.id);
                } else {
                    this.noEmptyStorages.delete(structure.id);
                }
                break;
        }
    }

    private clearStructure(structureId: string) {
        this.noFullTowers.delete(structureId);
        this.noFullStorages.delete(structureId);
        this.noEmptyStorages.delete(structureId);
        this.structures.delete(structureId);
        this.noFullSpawnRelateds.delete(structureId);
        this.brokenStructures.delete(structureId);
    }

    private initStructures(room: Room) {
        const structures = room.find(FIND_STRUCTURES)
        for (const structure of structures) {
            this.structures.add(structure.id);
            this.updateStructureById(structure.id);
        }
    }

    updateStructures(room: Room) {
        const structures = room.find(FIND_STRUCTURES)

        for (const structure of structures) {
            if (!this.structures.has(structure.id)) {
                this.structures.add(structure.id);
            }
        }

        for (const id of this.structures) {
            this.updateStructureById(id);
        }
    }

    updateStructureById(id: string) {
        const struct = Game.getObjectById<AnyStructure>(id);
        if (struct && struct instanceof Structure)
            this.groupingStructure(struct);
        else
            this.clearStructure(id);
    }

    // Creep

    private groupingCreep(creep: Creep) {
        const creepMemory = creep.memory as CreepMemoryExt;
        if (creepMemory.Task == Task.Idle) {
            if (_.sum(creep.carry) == 0) {
                this.idleEmptyCreeps.add(creep.id);//init idleEmptyCreeps
            } else {
                this.idleNotEmptyCreeps.add(creep.id);//init idleNotEmptyCreeps

                // idleHasEnergyCreeps
                if (creep.carry.energy != 0) this.idleHasEnergyCreeps.add(creep.id);
                else this.idleHasEnergyCreeps.delete(creep.id);
            }
        }
        else {
            this.idleEmptyCreeps.delete(creep.id);
            this.idleNotEmptyCreeps.delete(creep.id);
            this.idleHasEnergyCreeps.delete(creep.id);
        }

    }

    private clearCreep(creepId: string) {
        this.removeCreepFromCounter(creepId);
        this.idleEmptyCreeps.delete(creepId);//update idleEmptyCreeps 
        this.idleNotEmptyCreeps.delete(creepId);//update idleNotEmptyCreeps
        this.idleHasEnergyCreeps.delete(creepId);

        const name = this.creeps[creepId];
        delete this.creeps[creepId];
        delete Game.creeps[name];
    }

    private initCreep(creep: Creep) {
        const creepMemory = creep.memory as CreepMemoryExt;
        if (creepMemory.Task == undefined) {
            creepMemory.Task = Task.Idle;
        }
        this.creeps[creep.id] = creep.name;
    }

    private initCreeps(room: Room) {
        const creeps = room.find(FIND_CREEPS)

        for (const creep of creeps) {
            if (creep.spawning || !creep.my) continue;

            this.initCreep(creep);
            this.addCreepToCounter(creep.id); 3
            this.groupingCreep(creep);
        }
    }

    updateCreeps(room: Room) {
        const creeps = room.find(FIND_CREEPS)

        for (const creep of creeps) {
            if (creep.spawning || !creep.my) continue;
            if (!this.creeps[creep.id]) {
                this.initCreep(creep);
                this.addCreepToCounter(creep.id);
            }
        }

        for (const creepId in this.creeps) {
            this.updateCreepById(creepId);
        }
    }

    updateCreepById(creepId: string) {
        const creep = Game.getObjectById<Creep>(creepId);
        if (creep && creep instanceof Creep)
            this.groupingCreep(creep)
        else
            this.clearCreep(creepId);
    }

    private checkCreepMemory(creepId: string): CreepMemoryExt | null {
        const creepName = this.creeps[creepId];
        if (!creepName) return null;
        const creepMemory = Memory.creeps[creepName] as CreepMemoryExt;

        const targetId = creepMemory.TaskTargetID;
        const task = creepMemory.Task;

        if (!task) {
            throw new Error("Invalid Creep.Task");
        }
        if (!targetId && task != Task.Idle) {
            throw new Error("Invalid Creep.TaskTargetID");
        }

        return creepMemory;
    }

    addCreepToCounter(creepId: string) {
        const targetCounter = this.taskTargetCounter;
        const taskCounter = this.taskCounter;

        const creepMemory = this.checkCreepMemory(creepId);
        if (!creepMemory) return;

        const targetId = creepMemory.TaskTargetID;
        const task = creepMemory.Task;

        //set taskCounter
        if (!taskCounter[task]) {
            taskCounter[task] = new Set()
        }
        taskCounter[task].add(creepId);

        //set taskTargetCounter
        if (targetId) {
            if (!targetCounter[targetId]) {
                targetCounter[targetId] = {};
            }
            let table = targetCounter[targetId];
            if (!table[task]) {
                table[task] = new Set();
            }
            table[task].add(creepId);
        }
    }

    removeCreepFromCounter(creepId: string) {
        const taskTargetCounter = this.taskTargetCounter;
        const taskCounter = this.taskCounter;

        const creepMemory = this.checkCreepMemory(creepId);
        if (!creepMemory) return;

        const targetId = creepMemory.TaskTargetID;
        const task = creepMemory.Task;

        //set taskCounter
        if (taskCounter[task]) {
            taskCounter[task].delete(creepId);
        }

        //set taskTargetCounter
        if (targetId) {
            const taskSets = taskTargetCounter[targetId];
            if (taskSets) {
                const set = taskSets[task];
                if (set) {
                    set.delete(creepId);
                    if (set.size == 0) delete taskSets[task];
                }
                if (Object.keys(taskSets).length == 0)
                    delete taskTargetCounter[targetId];
            }
        }
    }

    // Source

    private groupingSource(source: Source) {
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

        let energy = SourceHelper.CalcEnergy(source);
        for (const creep of harvest) {
            const creepMemory = creep.memory as CreepMemoryExt;
            energy -= creep.carryCapacity - _.sum(creep.carry);
        }

        const data = this.sources[source.id];
        if (harvest.length < data.maxRoom && energy > 0) {
            this.canHarvestSources.add(source.id);
        } else {
            this.canHarvestSources.delete(source.id);
        }
    }

    private initSource(source: Source) {
        const data = new SourceData(source);
        this.sources[source.id] = data;
    }

    private initSources(room: Room) {
        const sources = room.find(FIND_SOURCES);

        for (const source of sources) {
            this.initSource(source);
            this.groupingSource(source);
        }
    }

    updateSources(room: Room) {
        for (const sourceId in this.sources) {
            this.updateSourceById(sourceId);
        }
    }

    updateSourceById(id: string) {
        const source = Game.getObjectById<Source>(id);
        if (source && source instanceof Source)
            this.groupingSource(source);
        else
            delete this.sources[id];
    }

    // Construction Site
    private initConstructionSites(room: Room) {
        const sites = room.find(FIND_CONSTRUCTION_SITES);

        for (const site of sites) {
            this.constructionSites.add(site.id);
        }
    }

    updateConstructionSites(room: Room) {
        const sites = room.find(FIND_CONSTRUCTION_SITES);

        for (const site of sites) {
            if (!this.constructionSites.has(site.id))
                this.constructionSites.add(site.id);
        }

        for (const id of this.constructionSites) {
            this.updateConstructionSiteById(id);
        }
    }

    updateConstructionSiteById(id: string) {
        const site = Game.getObjectById<ConstructionSite>(id);
        if (!site || !(site instanceof ConstructionSite)) {
            this.constructionSites.delete(id);
        }
    }

    // Resource
    private groupingResource(res: Resource) {
        const sumPickup = this.countTaskAmount(res, Task.Pickup);
        if (res.amount > sumPickup) {
            this.canPickupResources.add(res.id);
        } else {
            this.canPickupResources.delete(res.id);
        }
    }

    private initResources(room: Room) {
        const resources = room.find(FIND_DROPPED_RESOURCES);

        for (const res of resources) {
            this.resources.add(res.id);
            this.groupingResource(res);
        }
    }

    private clearResources(id: string) {
        this.resources.delete(id);
        this.canPickupResources.delete(id);
    }

    updateResources(room: Room) {
        const resources = room.find(FIND_DROPPED_RESOURCES);

        for (const res of resources) {
            if (!this.resources.has(res.id)) {
                this.resources.add(res.id);
                this.groupingResource(res)
            }
        }

        for (const id of this.resources) {
            const res = Game.getObjectById<Resource>(id);
            if (!res) this.clearResources(id);
            else this.groupingResource(res);
        }
    }

    updateResourceById(id: string) {
        const res = Game.getObjectById<Resource>(id);
        if (res && res instanceof Resource)
            this.groupingResource(res);
        else
            this.clearResources(id);
    }
}
