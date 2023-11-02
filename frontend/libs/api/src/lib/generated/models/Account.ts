/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { AccountDetails } from './AccountDetails';
import type { AccountType } from './AccountType';

export type Account = {
    id: number;
    group_id: number;
    type: AccountType;
    is_wip: boolean;
    last_changed: string;
    committed_details: (AccountDetails | null);
    pending_details: (AccountDetails | null);
};

