/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { AccountType } from './AccountType';

export type NewAccount = {
    type: AccountType;
    name: string;
    description?: string;
    owning_user_id?: (number | null);
    date_info?: (string | null);
    deleted?: boolean;
    tags?: Array<string>;
    clearing_shares?: (Record<string, number> | null);
};

