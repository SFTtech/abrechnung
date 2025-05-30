/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FrontendConfig } from "../models/FrontendConfig";
import type { VersionResponse } from "../models/VersionResponse";
import type { CancelablePromise } from "../core/CancelablePromise";
import type { BaseHttpRequest } from "../core/BaseHttpRequest";
export class CommonService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get Version
     * @returns VersionResponse Successful Response
     * @throws ApiError
     */
    public getVersion(): CancelablePromise<VersionResponse> {
        return this.httpRequest.request({
            method: "GET",
            url: "/api/version",
        });
    }
    /**
     * Get Frontend Config
     * @returns FrontendConfig Successful Response
     * @throws ApiError
     */
    public getFrontendConfig(): CancelablePromise<FrontendConfig> {
        return this.httpRequest.request({
            method: "GET",
            url: "/api/config",
        });
    }
}
