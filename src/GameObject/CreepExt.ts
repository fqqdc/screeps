import { IMediator, IReporter } from "./Mediator";

export default class CreepExt implements IReporter {
    private record: any;

    constructor(private creepId: string,
        private mediator: IMediator<Creep>) {
        this.mediator.registerReporter(this);
        this.record = {
            carry: {}, };
    }

    Check():Boolean {
        const creep = Game.getObjectById<Creep>(this.creepId);
        if (creep == null) return false;

        let hasChanged = false;
        const carry = creep.carry as {};
        for (const n in creep.carry) {
            if (this.record.carry.energy == creep.carry.energy) continue;

            this.record.carry.energy = creep.carry.energy;
        }

        return true;
    }
}
