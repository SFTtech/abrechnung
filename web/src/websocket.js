export const URL = 'ws://localhost:9048';


export class SFTWebsocket {
    constructor(url) {
        this.url = url;
        this.handlers = {};
        this.ws = new WebSocket(this.url);
        this.ws.onopen = this.onopen;
        this.ws.onclose = this.onclose;
        this.ws.onmessage = this.onmessage;

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
            this.handlers[msg.id](msg);
            delete this.handlers[msg.id]
        }
    }
    send = (msg) => {
        this.ws.send(JSON.stringify(msg));
    }
    call = (func, args, handler) => {
        // will return a promise that will be executed once the response arrives
        const msg = {
            type: "call",
            func: func,
            args: args,
            id: this.nextId
        };
        console.log("WS Sending message with args: ", msg)
        this.handlers[msg.id] = handler;
        this.ws.send(JSON.stringify(msg));
        this.nextId++;

        return new Promise((resolve, reject) => {})
    }
}

export const ws = new SFTWebsocket(URL)