export type EventEmitterListener<PayloadType> = (payload: PayloadType) => void;

export class EventEmitter<PayloadType> {
    private listeners: EventEmitterListener<PayloadType>[] = [];
    public emit = (payload: PayloadType) => {
        for (const listener of this.listeners) {
            listener(payload);
        }
    };

    public addListener = (listener: EventEmitterListener<PayloadType>) => {
        this.listeners.push(listener);
    };

    public removeAllListeners = () => {
        this.listeners = [];
    };
}
