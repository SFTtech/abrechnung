/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { TransactionPosition } from './TransactionPosition';

export type RawTransaction = {
    id: number;
    group_id: number;
    type: string;
    name: string;
    description: (string | null);
    value: number;
    currency_symbol: string;
    currency_conversion_rate: number;
    billed_at: string;
    deleted: boolean;
    creditor_shares: Record<string, number>;
    debitor_shares: Record<string, number>;
    tags: Array<string>;
    positions: Array<TransactionPosition>;
};

