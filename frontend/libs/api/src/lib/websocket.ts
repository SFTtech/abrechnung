import { Api } from "./api";

interface AccountChanged {
    type: "account";
    groupId: number;
    accountId: number;
    revisionCommittedAt: string | null;
    revisionStartedAt: string;
    version: number;
}

interface TransactionChanged {
    type: "transaction";
    groupId: number;
    transactionId: number;
    revisionCommittedAt: string | null;
    revisionStartedAt: string;
    version: number;
}

interface GroupChanged {
    type: "group";
    userId: number;
    groupId: number;
}

interface GroupMemberChanged {
    type: "group_member";
    groupId: number;
    memberId: number;
}

interface GroupInviteChanged {
    type: "group_invite";
    groupId: number;
    inviteId: number;
}

interface GroupLogChanged {
    type: "group_log";
    groupId: number;
    logId: number;
}

export type NotificationPayload =
    | AccountChanged
    | TransactionChanged
    | GroupChanged
    | GroupMemberChanged
    | GroupInviteChanged
    | GroupLogChanged;

type SubscriptionType = NotificationPayload["type"];
type SubscriptionCallback = (payload: NotificationPayload) => void;

const parseNotificationPayload = (
    subscriptionType: SubscriptionType,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: any
): NotificationPayload | undefined => {
    switch (subscriptionType) {
        case "account":
            return {
                type: "account",
                groupId: payload.element_id as number,
                accountId: payload.account_id as number,
                revisionCommittedAt: payload.revision_committed as string | null,
                revisionStartedAt: payload.revision_started as string,
                version: payload.version as number,
            };
        case "transaction":
            return {
                type: "transaction",
                groupId: payload.element_id as number,
                transactionId: payload.transaction_id as number,
                revisionCommittedAt: payload.revision_committed as string | null,
                revisionStartedAt: payload.revision_started as string,
                version: payload.version as number,
            };
        case "group":
            return {
                type: "group",
                userId: payload.element_id as number,
                groupId: payload.group_id as number,
            };
        case "group_member":
            return {
                type: "group_member",
                groupId: payload.element_id as number,
                memberId: payload.user_id as number,
            };
        case "group_invite":
            return {
                type: "group_invite",
                groupId: payload.element_id as number,
                inviteId: payload.invite_id as number,
            };
        case "group_log":
            return {
                type: "group_log",
                groupId: payload.element_id as number,
                logId: payload.log_id as number,
            };
        default:
            return undefined;
    }
};

export class AbrechnungWebSocket {
    private ws?: WebSocket;
    private msgQueue: object[] = [];

    // subscription type -> element id -> callback
    private notificationHandlers: {
        [k: string]: {
            [k: number]: SubscriptionCallback[];
        };
    } = {};
    private bareNotificationHandler: SubscriptionCallback[] = [];

    constructor(
        private url: string,
        private api: Api
    ) {}

    public setUrl = (url: string) => {
        this.url = url;
        this.init();
    };

    private init = () => {
        console.log("WS Init started");
        this.ws = new WebSocket(this.url);
        this.ws.onopen = this.onopen;
        this.ws.onclose = this.onclose;
        this.ws.onmessage = this.onmessage;
    };

    private onopen = () => {
        console.log("WS Connected");
        while (this.msgQueue.length > 0) {
            const elem = this.msgQueue.pop();
            if (elem) {
                this.send(elem);
            }
        }
        for (const subscriptionType in this.notificationHandlers) {
            for (const elementId in this.notificationHandlers[subscriptionType]) {
                this.sendSubscriptionRequest(subscriptionType, Number(elementId));
            }
        }
    };

    private onclose = () => {
        console.log("WS Disconnected");
        this.init();
    };

    public waitUntilAuthenticated = async () => {
        await this.api.waitUntilAuthenticated();
    };

    private onmessage = (evt: MessageEvent) => {
        let msg;
        try {
            msg = JSON.parse(evt.data);
        } catch {
            console.warn("received malformed message on web socket");
            return;
        }

        // TODO: message format validation
        if (msg.type === "error") {
            console.log("WS Received error: ", msg.data);
        } else if (msg.type === "notification") {
            console.log("received notification", msg);
            const subscriptionType = msg.data.subscription_type as SubscriptionType; // TODO: handle unknown type
            const payload = parseNotificationPayload(subscriptionType, msg.data);
            if (payload === undefined) {
                console.warn("WS: received unknown notification");
                return;
            }

            console.log(this.bareNotificationHandler);
            for (const callback of this.bareNotificationHandler) {
                callback(payload);
            }

            if (this.notificationHandlers[subscriptionType] !== undefined) {
                const elementId: number = msg.data["element_id"];
                if (this.notificationHandlers[subscriptionType][elementId] !== undefined) {
                    for (const callback of this.notificationHandlers[subscriptionType][elementId]) {
                        callback(payload);
                    }
                }
            }
        } else {
            // console.log("WS received unhandled message", msg);
        }
    };

    private send = (msg: object) => {
        if (this.ws === undefined || this.ws.readyState !== 1) {
            this.msgQueue.push(msg);
        } else {
            // console.log("WS Sent message with args: ", msg);
            this.ws.send(JSON.stringify(msg));
        }
    };

    public sendSubscriptionRequest = (subscriptionType: string, elementId: number) => {
        const token = this.api.getToken();
        return this.send({
            type: "subscribe",
            token: token,
            data: {
                subscription_type: subscriptionType,
                element_id: elementId,
            },
        });
    };

    public sendUnsubscriptionRequest = (subscriptionType: string, elementId: number) => {
        const token = this.api.getToken();
        this.send({
            type: "unsubscribe",
            token: token,
            data: {
                subscription_type: subscriptionType,
                element_id: elementId,
            },
        });
    };

    public subscribe = (subscriptionType: SubscriptionType, elementId: number, callback: SubscriptionCallback) => {
        if (this.notificationHandlers[subscriptionType] === undefined) {
            this.notificationHandlers[subscriptionType] = {};
        }

        if (this.notificationHandlers[subscriptionType][elementId] === undefined) {
            this.notificationHandlers[subscriptionType][elementId] = [callback];
            this.sendSubscriptionRequest(subscriptionType, elementId);
        } else {
            this.notificationHandlers[subscriptionType][elementId].push(callback);
        }
    };

    public unsubscribe = (subscriptionType: SubscriptionType, elementId: number, callback: SubscriptionCallback) => {
        if (this.notificationHandlers[subscriptionType] === undefined) {
            return;
        }
        if (this.notificationHandlers[subscriptionType][elementId] === undefined) {
            return;
        }
        this.notificationHandlers[subscriptionType][elementId] = this.notificationHandlers[subscriptionType][
            elementId
        ].filter((cb) => cb !== callback);

        if (this.notificationHandlers[subscriptionType][elementId].length === 0) {
            this.sendUnsubscriptionRequest(subscriptionType, elementId);
        }
    };

    public addBareNotificationHandler = (handler: SubscriptionCallback) => {
        console.log("adding bare notification handler");
        this.bareNotificationHandler.push(handler);
    };
    public removeBareNotificationHandler = (handler: SubscriptionCallback) => {
        console.log("removing bare notification handler");
        this.bareNotificationHandler = this.bareNotificationHandler.filter((h) => h !== handler);
    };
}
