import { Roler } from "Constant";



function parts(str: string) {
    let parts:string[] = [];
    const data: { [k: string]: string } = {
        W: WORK,
        M: MOVE,
        C: CARRY,
        A: ATTACK,
        R: RANGED_ATTACK,
        H: HEAL,
        T: TOUGH
    };
    for (var i = 0; i < str.length; i++) {
        if (str.charAt(i) != ' ') {
            parts.push(data[str.charAt(i)]);
        }
        if (parts.length === 50)
            break;
    }
    return parts;
}

function calcBodyCost(body: BodyPartConstant[]) {
    return _.reduce(body, (sum, part) => sum + BODYPART_COST[part], 0);
}

function createbody(spawn: StructureSpawn, bodyItr: string[]) {
    let workerBody: string[] = [];
    workerBody.concat(bodyItr);

    while (calcBodyCost(workerBody as BodyPartConstant[]) + calcBodyCost(bodyItr as BodyPartConstant[]) <= spawn.room.energyAvailable &&
        workerBody.length + bodyItr.length <= MAX_CREEP_SIZE) {
        workerBody = workerBody.concat(bodyItr);
    }
    return workerBody as BodyPartConstant[];
}


export const SpawnHelper = {
    CreateCreep: function (spawn: StructureSpawn, bodyCode:string, roler:Roler) {
        let body = createbody(spawn, parts(bodyCode));
        let number = parseInt((Math.random() * 900 + 100).toString());
        let cname = roler.toString().toUpperCase().charAt(0) + body.length + '-' + number;

        // TODO No statistics on construction costs
        if (spawn.spawnCreep(body, cname, { dryRun: true }) == OK) {
            let result = spawn.spawnCreep(body, cname, { memory: { role: roler } });
            if (result == OK) {
                console.log('createCreep:' + roler + " " + cname);
                return true;
            } else {
                console.log('fail to createCreep:' + result);
            }
        }
        return false;
    }
};
