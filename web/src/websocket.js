export const URL = 'ws://localhost:9048';


export class SFTWebsocket {
    constructor(url) {
        this.url = url;
        this.handlers = {};
        this.notificationHandlers = {}
        this.ws = new WebSocket(this.url);
        this.ws.onopen = this.onopen;
        this.ws.onclose = this.onclose;
        this.ws.onmessage = this.onmessage;

        this.msgQueue = [];

        this.nextId = 0;
    }

    initWs = () => {
        this.ws = new WebSocket(this.url);
        this.ws.onopen = this.onopen;
        this.ws.onclose = this.onclose;
        this.ws.onmessage = this.onmessage;
    }
    onopen = () => {
        console.log("WS Connected");
        while (this.msgQueue.length > 0) {
            this.send(this.msgQueue.pop());
        }
    }
    onclose = () => {
        console.log("WS Disconnected");
        this.initWs();
    }
    onmessage = (evt) => {
        const msg = JSON.parse(evt.data)

        // TODO: message format validation
        if (msg.type === "call-result" && this.handlers.hasOwnProperty(msg.id)) {
            console.log("WS Received call result: ", msg);
            const {resolve} = this.handlers[msg.id];
            // convert the colums - data response to a JSON object
            resolve(msg.data);
            delete this.handlers[msg.id];
        } else if (msg.type === "call-error" && this.handlers.hasOwnProperty(msg.id)) {
            const {reject} = this.handlers[msg.id];
            console.log("received error: ", msg.error);
            reject(msg.error);
            delete this.handlers[msg.id];
        } else if (msg.type === "notification") {
            console.log("received notification", msg);
            if (this.notificationHandlers.hasOwnProperty(msg.event)) {
                this.notificationHandlers[msg.event](msg.args);
            }
        }
    }
    send = (msg) => {
        if (this.ws.readyState !== 1) {
            this.msgQueue.push(msg);
        } else {
            console.log("WS Sent message with args: ", msg)
            this.ws.send(JSON.stringify(msg));
        }
    }
    call = (func, args) => {
        // will return a promise that will be executed once the response arrives
        const msg = {
            type: "call",
            func: func,
            args: args,
            id: this.nextId
        };
        const promise = new Promise((resolve, reject) => {
            this.handlers[msg.id] = {resolve: resolve, reject: reject}
        });
        this.send(msg);
        this.nextId++;

        return promise;
    }
    subscribe = (token, type, func, args) => {
        this.notificationHandlers[type] = func;
        const callArgs = {
            token: token,
            subscription_type: type,
            ...args
        }
        return this.call("subscribe", callArgs);
    }
    unsubscribe = (type, args) => {
        delete this.notificationHandlers[type];
        const callArgs = {
            subscription_type: type,
            ...args
        }
        return this.call("unsubscribe", callArgs);
    }
}

export const ws = new SFTWebsocket(URL)