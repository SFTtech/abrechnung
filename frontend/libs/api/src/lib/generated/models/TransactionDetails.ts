/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type TransactionDetails = {
    name: string;
    description: string | null;
    value: number;
    currency_symbol: string;
    currency_conversion_rate: number;
    billed_at: string;
    tags: Array<string>;
    deleted: boolean;
    creditor_shares: Record<string, number>;
    debitor_shares: Record<string, number>;
};
