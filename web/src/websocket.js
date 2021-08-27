
// TODO: make this pretty
import {fetchToken} from "./api";

export const URL = "ws://localhost:8080/api/v1/ws";


export class SFTWebsocket {
    constructor(url) {
        this.url = url;
        // maps scope (account, group, transaction) to a handler
        this.userHandlers = [];
        this.groupHandlers = {}

        this.isAuthenticated = false;
        this.ws = new WebSocket(this.url);
        this.ws.onopen = this.onopen;
        this.ws.onclose = this.onclose;
        this.ws.onmessage = this.onmessage;

        this.rawQueue = [];
        this.msgQueue = [];
    }

    init = () => {
        console.log("WS Init started")
        this.isAuthenticated = false;
        this.ws = new WebSocket(this.url);
        this.ws.onopen = this.onopen;
        this.ws.onclose = this.onclose;
        this.ws.onmessage = this.onmessage;
    }

    tryAuthenticate = () => {
        this.isAuthenticated = false;
        this.sendRaw({type: "auth", data: {"access_token": fetchToken()}})
    }

    didAuthenticate = () => {
        while (this.msgQueue.length > 0) {
            this.send(this.msgQueue.pop());
        }
    }
    onopen = () => {
        console.log("WS Connected");
        while (this.rawQueue.length > 0) {
            this.send(this.rawQueue.pop());
        }
    }
    onclose = () => {
        console.log("WS Disconnected");
        this.init();
        this.tryAuthenticate();
    }
    onmessage = (evt) => {
        const msg = JSON.parse(evt.data)
        console.log("WS received message:", msg)

        // TODO: message format validation
        if (msg.type === "auth_success") {
            this.isAuthenticated = true;
            this.didAuthenticate();
        } else if (msg.type === "error") {
            console.log("WS Received error: ", msg.data);
        } else if (msg.type === "notification") {
            console.log("received notification", msg);
            if (msg.data.scope === "group") {
                for (const handler of this.userHandlers) {
                    // TODO: message format validation
                    handler(msg.data)
                }
            } else {
                const groupID = msg.data.group_id;
                if (this.groupHandlers.hasOwnProperty(groupID)) {
                    for (const handler of this.groupHandlers[groupID]) {
                        // TODO: message format validation
                        handler(msg.data)
                    }
                }
            }
        }
    }
    sendRaw = (msg) => {
        if (this.ws.readyState !== 1) {
            this.rawQueue.push(msg);
        } else {
            console.log("WS Sent raw message with args: ", msg)
            this.ws.send(JSON.stringify(msg));
        }
    }
    send = (msg) => {
        if (this.ws.readyState !== 1 || !this.isAuthenticated) {
            this.msgQueue.push(msg);
        } else {
            console.log("WS Sent authenticated message with args: ", msg)
            this.ws.send(JSON.stringify(msg));
        }
    }
    subscribeUser = (scope, func) => {
        this.userHandlers.push(func);
        return this.send({
            type: "subscribe",
            data: {
                scope: scope
            }
        });
    }
    unsubscribeUser = (scope) => {
        return this.send({
            type: "unsubscribe",
            data: {
                scope: scope
            }
        });
    }

    subscribe = (scope, groupID, func) => {
        if (this.groupHandlers.hasOwnProperty(groupID)) {
            this.groupHandlers[groupID].push(func);
        } else {
            this.groupHandlers[groupID] = [func];
        }
        return this.send({
            type: "subscribe",
            data: {
                scope: scope,
                group_id: groupID
            }
        });
    }
    unsubscribe = (scope, groupID) => {
        return this.send({
            type: "unsubscribe",
            data: {
                scope: scope,
                group_id: groupID
            }
        });
    }
}

export const ws = new SFTWebsocket(URL)