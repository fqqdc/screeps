export interface IPredicate {
    execute(): boolean;
}

export class Predicate implements IPredicate{
    constructor(private func: () => boolean) { }

    execute(): boolean {
        return this.func();
    }
}

export class OrPredicate implements IPredicate {
    constructor(private or: IPredicate[]) { }

    add(p: Predicate) {
        this.or.push(p);
    }

    execute(): boolean {
        for (const p of this.or) {
            if (p.execute()) return true;
        }
        return false;
    }
}

export class AndPredicate implements IPredicate{
    constructor(private or: IPredicate[]) {}

    add(p: Predicate) {
        this.or.push(p);
    }

    execute(): boolean {
        for (const p of this.or) {
            if (!p.execute()) return false;
        }
        return true;
    }
}
