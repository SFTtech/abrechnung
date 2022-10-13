export default class NotificationTracker<NotificationPayload> {
    subscribers: {
        [identifier: string]: {
            [callback_id: number]: (payload: NotificationPayload) => void;
        };
    }; // map group id to list of callback
    next_callback_id = 0;

    constructor() {
        this.subscribers = {};
    }

    subscribe = (identifier: string | number, callback: (payload: NotificationPayload) => void) => {
        if (!this.subscribers.hasOwnProperty(identifier)) {
            this.subscribers[identifier] = {};
        }

        const callback_id = this.next_callback_id++;
        this.subscribers[identifier][callback_id] = callback;
        return () => {
            delete this.subscribers[identifier][callback_id];
        };
    };

    notify = (identifier: string | number, payload: NotificationPayload) => {
        if (this.subscribers.hasOwnProperty(identifier)) {
            Object.values(this.subscribers[identifier]).forEach((callback) => callback(payload));
        }
    };
}
