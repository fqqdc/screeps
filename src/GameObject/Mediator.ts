export interface IMediator<T> {
    registerReporter(reporter: IReporter): void;
    registerListener(listener: IListener<T>, category: string): void;

    updateReporter(id: string, category:string): void;
}

export interface IReporter {
}

export interface IListener<T> {
    update(msg: T): void;
}
