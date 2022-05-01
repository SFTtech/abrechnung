// TODO: make this pretty
import { fetchToken, siteHost } from "./api";

const URL = `${window.location.protocol === "https:" ? "wss" : "ws"}://${siteHost}/api/v1/ws`;
console.log(URL);

export type subscriptionCallback = (subscriptionType: string, data: { [k: string]: any }) => void;

export class SFTWebsocket {
    url: string;
    ws: WebSocket;
    isAuthenticated: boolean;
    msgQueue: Array<object>;
    notificationHandlers: {
        [k: string]: {
            subscriptionType: string;
            elementID: number;
            func: subscriptionCallback;
        };
    };

    constructor(url: string) {
        this.url = url;
        // subscription_type -> callback
        this.notificationHandlers = {};

        this.ws = new WebSocket(this.url);
        this.ws.onopen = this.onopen;
        this.ws.onclose = this.onclose;
        this.ws.onmessage = this.onmessage;

        this.msgQueue = [];
        this.isAuthenticated = false;
    }

    init = () => {
        console.log("WS Init started");
        this.isAuthenticated = false;
        this.ws = new WebSocket(this.url);
        this.ws.onopen = this.onopen;
        this.ws.onclose = this.onclose;
        this.ws.onmessage = this.onmessage;
    };
    onopen = () => {
        console.log("WS Connected");
        while (this.msgQueue.length > 0) {
            const elem = this.msgQueue.pop();
            if (elem) {
                this.send(elem);
            }
        }
        Object.entries(this.notificationHandlers).forEach(([subscriptionType, values]) => {
            this.sendSubscriptionRequest(subscriptionType, values["elementID"]);
        });
    };
    onclose = () => {
        console.log("WS Disconnected");
        this.init();
    };
    onmessage = (evt: MessageEvent) => {
        const msg = JSON.parse(evt.data);

        // TODO: message format validation
        if (msg.type === "error") {
            console.log("WS Received error: ", msg.data);
        } else if (msg.type === "notification") {
            console.log("received notification", msg);
            const subscriptionType = msg.data.subscription_type;
            if (this.notificationHandlers.hasOwnProperty(subscriptionType)) {
                this.notificationHandlers[subscriptionType].func(subscriptionType, msg.data);
            }
        } else {
            console.log("WS received unhandled message", msg);
        }
    };
    send = (msg: object) => {
        if (this.ws.readyState !== 1) {
            this.msgQueue.push(msg);
        } else {
            console.log("WS Sent message with args: ", msg);
            this.ws.send(JSON.stringify(msg));
        }
    };

    sendSubscriptionRequest = (subscriptionType: string, elementID: number) => {
        return this.send({
            type: "subscribe",
            token: fetchToken(),
            data: {
                subscription_type: subscriptionType,
                element_id: elementID,
            },
        });
    };

    subscribe = (subscriptionType: string, elementID: number, func: subscriptionCallback) => {
        this.notificationHandlers[subscriptionType] = {
            subscriptionType: subscriptionType,
            elementID: elementID,
            func: func,
        };
        return this.sendSubscriptionRequest(subscriptionType, elementID);
    };
    unsubscribe = (subscriptionType: string, elementID: number) => {
        return this.send({
            type: "unsubscribe",
            token: fetchToken(),
            data: {
                subscription_type: subscriptionType,
                element_id: elementID,
            },
        });
    };
}

export const ws = new SFTWebsocket(URL);
