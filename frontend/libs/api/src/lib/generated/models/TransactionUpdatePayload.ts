/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { TransactionPosition } from './TransactionPosition';

export type TransactionUpdatePayload = {
    name: string;
    description: (string | null);
    value: number;
    currency_symbol: string;
    currency_conversion_rate: number;
    billed_at: string;
    tags: Array<string>;
    creditor_shares: Record<string, number>;
    debitor_shares: Record<string, number>;
    positions?: (Array<TransactionPosition> | null);
    deleted?: boolean;
    perform_commit?: boolean;
};

