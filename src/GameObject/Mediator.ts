export interface IMediator {
    registerReporter(reporter: IReporter): void;
    registerListener(listener: IListener, msg: IMessage): void;
    cancelListener(listener: IListener, msg: IMessage): void;

    updateReporter(msg: IMessage): void;
}

export interface IReporter {
}

export interface IListener {
    update(msg: IMessage): void;
}

export interface IMessage {
    id: string;
    type: string;
    propertyName: string;
}
