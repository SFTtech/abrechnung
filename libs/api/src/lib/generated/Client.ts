/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BaseHttpRequest } from "./core/BaseHttpRequest";
import type { OpenAPIConfig } from "./core/OpenAPI";
import { FetchHttpRequest } from "./core/FetchHttpRequest";
import { AccountsService } from "./services/AccountsService";
import { AuthService } from "./services/AuthService";
import { CommonService } from "./services/CommonService";
import { GroupInvitesService } from "./services/GroupInvitesService";
import { GroupLogsService } from "./services/GroupLogsService";
import { GroupMembersService } from "./services/GroupMembersService";
import { GroupsService } from "./services/GroupsService";
import { TransactionsService } from "./services/TransactionsService";
type HttpRequestConstructor = new (config: OpenAPIConfig) => BaseHttpRequest;
export class Client {
    public readonly accounts: AccountsService;
    public readonly auth: AuthService;
    public readonly common: CommonService;
    public readonly groupInvites: GroupInvitesService;
    public readonly groupLogs: GroupLogsService;
    public readonly groupMembers: GroupMembersService;
    public readonly groups: GroupsService;
    public readonly transactions: TransactionsService;
    public readonly request: BaseHttpRequest;
    constructor(config?: Partial<OpenAPIConfig>, HttpRequest: HttpRequestConstructor = FetchHttpRequest) {
        this.request = new HttpRequest({
            BASE: config?.BASE ?? "",
            VERSION: config?.VERSION ?? "1.1.0",
            WITH_CREDENTIALS: config?.WITH_CREDENTIALS ?? false,
            CREDENTIALS: config?.CREDENTIALS ?? "include",
            TOKEN: config?.TOKEN,
            USERNAME: config?.USERNAME,
            PASSWORD: config?.PASSWORD,
            HEADERS: config?.HEADERS,
            ENCODE_PATH: config?.ENCODE_PATH,
        });
        this.accounts = new AccountsService(this.request);
        this.auth = new AuthService(this.request);
        this.common = new CommonService(this.request);
        this.groupInvites = new GroupInvitesService(this.request);
        this.groupLogs = new GroupLogsService(this.request);
        this.groupMembers = new GroupMembersService(this.request);
        this.groups = new GroupsService(this.request);
        this.transactions = new TransactionsService(this.request);
    }
}
