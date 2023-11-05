/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
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
}
