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
    taskTargetCounter: { [id: string]: { [task: string]: Set<string> } };

    creeps: Set<string>;
    idleEmptyCreeps: Set<string>;
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

        this.creeps = new Set();
        this.idleEmptyCreeps = new Set();
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

    // Structure

    private initStructure(structure: AnyStructure) {
        this.structures.add(structure.id);
    }

    private countTransfer(structure: AnyStructure) {
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

        return sumTransfer;
    }

    private countWithdraw(structure: AnyStructure) {
        let sumWithdraw = 0;
        const withdraw: Creep[] = [];
        const dict = this.taskTargetCounter[structure.id];
        if (dict) {
            const set = dict[Task.Withdraw];
            if (set) {
                set.forEach(id => {
                    const creep = Game.getObjectById<Creep>(id);
                    if (creep) {
                        const memory = creep.memory as CreepMemoryExt;
                        if (memory.Task == Task.Transfer)
                            withdraw.push(creep);
                    }
                });
            }
        }

        for (const creep of withdraw) {
            sumWithdraw += creep.carryCapacity - _.sum(creep.carry);
        }

        return sumWithdraw;
    }

    private countRepair(structure: AnyStructure) {
        let sumRepair = 0;
        const repair: Creep[] = [];
        const dict = this.taskTargetCounter[structure.id];
        if (dict) {
            const set = dict[Task.Repair];
            if (set) {
                set.forEach(id => {
                    const creep = Game.getObjectById<Creep>(id);
                    if (creep) {
                        const memory = creep.memory as CreepMemoryExt;
                        if (memory.Task == Task.Transfer)
                            repair.push(creep);
                    }
                });
            }
        }

        for (const creep of repair) {
            sumRepair += creep.getActiveBodyparts(WORK) * 100 * creep.carry.energy;
        }

        return sumRepair;
    }

    removeNotExistStructure(structureId: string) {
        const structure = Game.getObjectById<AnyStructure>(structureId);
        if (!structure) {
            this.noFullTowers.delete(structureId);
            this.noFullStorages.delete(structureId);
            this.noEmptyStorages.delete(structureId);
            this.structures.delete(structureId);
            this.noFullSpawnRelateds.delete(structureId);
            this.brokenStructures.delete(structureId);
        }
    }

    updateStructure(structure: AnyStructure) {
        const sumRepair = this.countRepair(structure);
        if (structure.hitsMax * 0.85 > structure.hits + sumRepair) {
            this.brokenStructures.add(structure.id);
        } else {
            this.brokenStructures.delete(structure.id);
        }

        const sumTransfer = this.countTransfer(structure);
        const sumWithdraw = this.countWithdraw(structure);
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

    private initStructures(room: Room) {
        const structures = room.find(FIND_STRUCTURES)
        for (const structure of structures) {
            this.initStructure(structure);
            this.updateStructure(structure);
        }
    }

    updateStructures(room: Room) {
        const structures = room.find(FIND_STRUCTURES)

        for (const structure of structures) {
            if (!this.structures.has(structure.id)) {
                this.initStructure(structure);
                this.updateStructure(structure);
            }
        }

        for (const id of Object.keys(this.structures)) {
            const structure = Game.getObjectById<AnyStructure>(id);
            if (structure == null) {
                this.structures.delete(id);
                this.noFullSpawnRelateds.delete(id);
                this.noFullTowers.delete(id);
            }
        }
    }

    // Creep

    updateCreep(creep: Creep) {
        const creepMemory = creep.memory as CreepMemoryExt;
        if (creepMemory.Task == Task.Idle) {
            if (_.sum(creep.carry) == 0) this.idleEmptyCreeps.add(creep.id);//init idleEmptyCreeps 
            else this.idleNotEmptyCreeps.add(creep.id);//init idleNotEmptyCreeps
        } else {
            this.idleEmptyCreeps.delete(creep.id);
            this.idleNotEmptyCreeps.delete(creep.id);
        }
    }

    removeCreep(creepId: string) {
        this.removeCreepFromCounter(creepId);
        this.creeps.delete(creepId);
        this.idleEmptyCreeps.delete(creepId);//update idleEmptyCreeps 
        this.idleNotEmptyCreeps.add(creepId);//update idleNotEmptyCreeps
        delete Memory.creeps[creepId];
    }

    private initCreeps(room: Room) {
        const creeps = room.find(FIND_CREEPS)

        for (const creep of creeps) {
            if (creep.spawning) continue;
            if (creep.my) {
                const creepMemory = creep.memory as CreepMemoryExt;
                if (creepMemory.Task == undefined) {
                    creepMemory.Task = Task.Idle;
                }
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

            if (creep.my && !this.creeps.has(creep.id)) {
                const creepMemory = creep.memory as CreepMemoryExt;
                if (creepMemory.Task == undefined) {
                    creepMemory.Task = Task.Idle;
                }
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
                this.removeCreep(id);;
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

                if (targetCounter[targetId][task].size == 0)
                    delete targetCounter[targetId][task];
            }
            if (Object.keys(targetCounter[targetId]).length == 0)
                delete targetCounter[targetId];
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
            this.updateCanHarvestSources(source);
        }
    }

    updateSources(room: Room) {
        const counter = this.taskTargetCounter;
        const sources = room.find(FIND_SOURCES);

        for (const source of sources) {
            if (this.sources[source.id] == undefined) {
                this.initSource(source);
            }
            this.updateCanHarvestSources(source);
        }
    }

    updateSource(source: Source) {
        this.updateCanHarvestSources(source);
    }

    // Construction Site
    private initConstructionSite(site: ConstructionSite) {
        this.constructionSites.add(site.id);
    }

    private initConstructionSites(room: Room) {
        const sites = room.find(FIND_CONSTRUCTION_SITES);

        for (const site of sites) {
            this.initConstructionSite(site);
        }
    }

    public updateConstructionSites(room: Room) {
        const sites = room.find(FIND_CONSTRUCTION_SITES);

        for (const site of sites) {
            if (!this.constructionSites.has(site.id))
                this.initConstructionSite(site);
        }

        for (const id of Object.keys(this.constructionSites)) {
            const site = Game.getObjectById<ConstructionSite>(id);
            if (site == null
                || !(site instanceof ConstructionSite)) {
                this.constructionSites.delete(id);
            }
        }
    }

    updateConstructionSite(site: ConstructionSite) {
        if (!(site instanceof ConstructionSite))
            this.constructionSites.delete((site as any).id);
    }

    removeConstructionSite(siteId: string) {
        const site = Game.getObjectById<ConstructionSite>(siteId);

        if (!(site) || !(site instanceof ConstructionSite))
            this.constructionSites.delete(siteId);
    }

    // Resource
    private initResource(res: Resource) {
        this.resources.add(res.id);
    }

    private initResources(room: Room) {
        const resources = room.find(FIND_DROPPED_RESOURCES);

        for (const res of resources) {
            this.initResource(res);
            this.updataResource(res);
        }
    }

    updataResources(room: Room) {
        const resources = room.find(FIND_DROPPED_RESOURCES);

        for (const res of resources) {
            if (!this.resources.has(res.id)) {
                this.initResource(res);
                this.updataResource(res)
            }
        }

        for (const id of Object.keys(this.resources)) {
            const site = Game.getObjectById<Resource>(id);
            if (site == null
                || !(site instanceof Resource)) {
                this.resources.delete(id);
                this.canPickupResources.delete(id);
            }
        }
    }

    private countPickup(res: Resource) {
        let sumPickup = 0;
        const pickup: Creep[] = [];
        const dict = this.taskTargetCounter[res.id];
        if (dict) {
            const set = dict[Task.Pickup];
            if (set) {
                set.forEach(id => {
                    const creep = Game.getObjectById<Creep>(id);
                    if (creep) {
                        const memory = creep.memory as CreepMemoryExt;
                        if (memory.Task == Task.Pickup)
                            pickup.push(creep);
                    }
                });
            }
        }

        for (const creep of pickup) {
            sumPickup += creep.carryCapacity - _.sum(creep.carry);
        }

        return sumPickup;
    }

    updataResource(res: Resource) {
        const sumPickup = this.countPickup(res)
        if (res.amount > sumPickup) {
            this.canPickupResources.add(res.id);
        } else {
            this.canPickupResources.delete(res.id);
        }
    }

    removeResource(resId: string) {
        const res = Game.getObjectById<Resource>(resId);

        if (!(res) || !(res instanceof Resource)) {
            this.resources.delete(resId);
            this.canPickupResources.delete(resId);
        }
    }

    // Tomb Stone

    //private initTombstones(room: Room) {
    //    const tombstones = room.find(FIND_TOMBSTONES);

    //    for (const tomb of tombstones) {
    //        this.initResource(res);
    //        this.updataResource(res);
    //    }
    //}
}
