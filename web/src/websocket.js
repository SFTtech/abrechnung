export const URL = 'ws://localhost:9048';


export class SFTWebsocket {
    constructor(url) {
        this.url = url;
        this.handlers = {};
        this.ws = new WebSocket(this.url);
        this.ws.onopen = this.onopen;
        this.ws.onclose = this.onclose;
        this.ws.onmessage = this.onmessage;
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
        if (msg.type === "call-result") {
            if (this.handlers.hasOwnProperty(msg.id)) {
                this.handlers[msg.id](msg.data);
                console.log("Called handler ", this.handlers[msg.id]);
                delete this.handlers[msg.id]
            } else {
                console.log("Received call-result for unknown call id ", msg.id);
            }
        }
    }
    send = (msg) => {
        this.ws.send(JSON.stringify(msg));
    }
    call = (id, func, args, handler) => {
        const msg = {
            type: "call",
            func: func,
            args: args,
            id: id
        };
        console.log("WS Sending message with args: ", msg)
        this.handlers[id] = handler;
        this.ws.send(JSON.stringify(msg));
    }
}

export const ws = new SFTWebsocket(URL)