export const URL = 'ws://localhost:9048';


export class SFTWebsocket {
    constructor(url) {
        this.url = url;
        this.handlers = {};
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
        for (const msg of this.msgQueue) {
            this.send(msg);
        }
    }
    onclose = () => {
        console.log("WS Disconnected");
        this.initWs();
    }
    onmessage = (evt) => {
        const msg = JSON.parse(evt.data)
        console.log("WS Received message: ", msg);

        // TODO: message format validation
        if (this.handlers.hasOwnProperty(msg.id)) {
            const { resolve, reject } = this.handlers[msg.id];
            if (msg.type === 'call-result') {
                // convert the colums - data response to a JSON object
                let response = []
                for (const row of msg.data) {
                    let obj = {}
                    for (let i = 0; i < msg.columns.length; i++) {
                        obj[msg.columns[i]] = row[i];
                    }
                    response.push(obj);
                }
                resolve(response);
            } else if (msg.type === 'call-error') {
                console.log("received error: ", msg.error);
                reject(msg.error);
            }
            delete this.handlers[msg.id]
        }
    }
    send = (msg) => {
        if (this.ws.readyState !== 1) {
            this.msgQueue.push(msg);
        } else {
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
        const promise = new Promise((resolve, reject) => {this.handlers[msg.id] = {resolve: resolve, reject: reject}});
        this.send(msg);
        console.log("WS Sent message with args: ", msg)
        this.nextId++;

        return promise;
    }
}

export const ws = new SFTWebsocket(URL)