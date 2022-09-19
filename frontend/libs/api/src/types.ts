export interface IApi {
    sessionToken: string | null;
    accessToken: string | null;
    baseApiUrl: string | null;
    updateAccessToken: () => Promise<string | null>;
}
