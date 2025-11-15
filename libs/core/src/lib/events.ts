type EventMap = Record<string, any>;
type EventKey<T extends EventMap> = string & keyof T;
type EventReceiver<T> = (params: T) => void;

export class NotificationEmitter<Events extends EventMap> {
    private listeners: { [E in keyof Events]?: EventReceiver<Events[E]>[] } = {};

    public on = <E extends EventKey<Events>>(event: E, listener: EventReceiver<Events[E]>) => {
        if (!this.listeners[event]) {
            this.listeners[event] = [listener];
        } else {
            this.listeners[event]?.push(listener);
        }
    };

    public emit = <E extends EventKey<Events>>(event: E, payload: Events[E]) => {
        this.listeners[event]?.forEach((listener) => listener(payload));
    };
}
