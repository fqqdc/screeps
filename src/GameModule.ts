import { CreepMemoryExt, MemoryExt, } from "helper";
import { Task, Roler } from "Constant";
import WorldManager from "game/WorldManager";

function DisplayVisualText() {

    for (const name in Game.spawns) {
        const spawn = Game.spawns[name];

        if (spawn.spawning) {
            var spawningCreep = Game.creeps[spawn.spawning.name];
            var pos = spawn.pos;
            spawn.room.visual.text(
                '🛠️' + spawningCreep.name, pos.x + 1, pos.y, { align: 'left', opacity: 0.8 });
        }
    }
}

export default class GameModule {
    Run() {
        WorldManager.Entity.ScanRooms();
        DisplayVisualText();
    }
}

