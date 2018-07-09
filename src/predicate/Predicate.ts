interface IPredicate {
    execute(): boolean;
}

class Predicate implements IPredicate{
    constructor(private func: () => boolean) { }

    execute(): boolean {
        return this.func();
    }
}

class OrPredicate implements IPredicate {
    constructor(private or: Predicate[]) { }

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

class AndPredicate implements IPredicate{
    constructor(private or: Predicate[]) {}

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
