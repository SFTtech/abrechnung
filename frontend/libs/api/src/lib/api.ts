import { Client } from "./generated";
import { IConnectionStatusProvider, IHttpError } from "./types";
import { isRequiredVersion } from "./version";

export class HttpError implements IHttpError {
    constructor(
        public statusCode: number,
        public message: string
    ) {}
}

// accepted version range of the backend api, [min, max)
export const MIN_BACKEND_VERSION = "0.14.0";
export const MAX_BACKEND_VERSION = "0.15.0";

export class Api {
    private baseApiUrl: string;
    private accessToken?: string;
    private backendVersion?: string;

    public client: Client;

    private authenticatedResolveCallbacks: Array<() => void> = [];

    constructor(
        private connectionStatusProvider: IConnectionStatusProvider,
        baseApiUrl: string
    ) {
        this.baseApiUrl = baseApiUrl;
        this.client = this.makeClient();
    }

    private makeClient = () => {
        return new Client({ BASE: this.baseApiUrl, TOKEN: this.accessToken });
    };

    public resetAuthState = () => {
        this.accessToken = undefined;
    };

    private notifyAuthenticatedWaiters = () => {
        for (const cb of this.authenticatedResolveCallbacks) {
            cb();
        }
    };

    public init = async (accessToken?: string) => {
        if (accessToken) {
            this.setAccessToken(accessToken);
        }
        await this.checkBackendVersion();
    };

    private checkBackendVersion = async () => {
        if (this.backendVersion === undefined) {
            try {
                const version = await this.client.common.getVersion();
                this.backendVersion = version.version;
            } catch {
                // TODO: what to do here, should we propagate this error?
                return;
            }
        }
        if (!isRequiredVersion(this.backendVersion, MIN_BACKEND_VERSION, MAX_BACKEND_VERSION)) {
            throw new Error(
                `This app version is incompatible with the version your backend is running. Expected ${MIN_BACKEND_VERSION} (inclusive) to ${MAX_BACKEND_VERSION} (exclusive), but the backend is running ${this.backendVersion}`
            );
        }
    };

    public waitUntilAuthenticated = async (): Promise<void> => {
        return new Promise<void>((resolve) => {
            if (this.accessToken !== null) {
                resolve();
            } else {
                this.authenticatedResolveCallbacks.push(resolve);
            }
        });
    };

    public getAccessToken = (): string | undefined => {
        return this.accessToken;
    };

    public setAccessToken = (token: string) => {
        this.accessToken = token;
        this.client = this.makeClient();
        this.notifyAuthenticatedWaiters();
    };

    public setBaseApiUrl = (url: string) => {
        this.baseApiUrl = url;
    };

    public getBaseApiUrl = (): string => {
        return this.baseApiUrl;
    };

    public hasConnection = () => {
        return this.connectionStatusProvider.hasConnection();
    };

    public fetchFile = async (fileId: number, blobId: number): Promise<string> => {
        const resp = await fetch(`${this.baseApiUrl}/api/v1/files/${fileId}/${blobId}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
            },
        });
        if (!resp.ok) {
            const body = await resp.text();
            try {
                const error = JSON.parse(body);
                throw new HttpError(resp.status, error.msg);
            } catch (e) {
                if (e instanceof HttpError) {
                    throw e;
                }
                throw new HttpError(resp.status, `Error on fetching file`);
            }
        }
        try {
            const blob = await resp.blob();
            return URL.createObjectURL(blob);
        } catch {
            console.warn(`Error on fetching file, no blob`);
            throw new HttpError(resp.status, `Error on fetching file, no blob`);
        }
    };

    public getToken = (): string => {
        if (this.accessToken == null) {
            throw new Error("no access token present");
        }

        return this.accessToken;
    };

    public getTokenJSON = (): { userID: number } | null => {
        if (this.accessToken == null) {
            return null;
        }
        const parsedToken = JSON.parse(atob(this.accessToken.split(".")[1]));
        const { user_id: userID } = parsedToken;
        return { userID };
    };
}
