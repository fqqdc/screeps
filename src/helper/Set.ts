export default class GameSet<T extends Idwise> {
    private entity: { [item: string]: any };

    constructor() {
        this.entity = {};
    }

    private check() {
        for (const id in this.entity) {
            const obj = Game.getObjectById(id);
            if (obj == null)
                delete this.entity[id];
        }
    }

    add(value: T): GameSet<T> {
        this.entity[value.id] = 0;
        return this;
    }

    delete(value: T): Boolean {
        let result;
        if (result = this.entity[value.id] != undefined)
            delete this.entity[value.id];
        return result;
    }

    has(value: T): Boolean {
        this.check();
        const result = this.entity[value.id] != undefined;
        return result;
    }

    array(): T[] {
        const arr: T[] = [];
        for (const id in this.entity) {
            const obj = Game.getObjectById(id);
            if (obj == null)
                delete this.entity[id];
            else
                arr.push(obj);
        }
        return arr;
    }
}

interface Idwise {
    id: string;
}
