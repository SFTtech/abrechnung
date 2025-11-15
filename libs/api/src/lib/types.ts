export interface IHttpError {
    statusCode: number;
    message: string;
}

export interface IConnectionStatusProvider {
    hasConnection: () => Promise<boolean>;
}
