/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { AccountDetails } from "./AccountDetails";

export type Account = {
    id: number;
    group_id: number;
    type: string;
    is_wip: boolean;
    last_changed: string;
    committed_details: AccountDetails | null;
    pending_details: AccountDetails | null;
};
