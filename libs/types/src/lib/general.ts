export class ValidationError extends Error {
    data: object;

    constructor(data: object) {
        super("validation error");
        this.data = data;
    }
}

export interface ErrorStruct {
    [k: string]: string;
}
