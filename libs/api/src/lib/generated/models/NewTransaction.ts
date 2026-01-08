/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* oxlint-disable */
import type { NewFile } from "./NewFile";
import type { NewTransactionPosition } from "./NewTransactionPosition";
import type { SplitMode } from "./SplitMode";
import type { TransactionType } from "./TransactionType";
export type NewTransaction = {
    type: TransactionType;
    name: string;
    description: string;
    value: number;
    currency_identifier: string;
    currency_conversion_rate: number;
    billed_at: string;
    tags?: Array<string>;
    creditor_shares: Record<string, number>;
    debitor_shares: Record<string, number>;
    split_mode: SplitMode;
    new_files?: Array<NewFile>;
    new_positions?: Array<NewTransactionPosition>;
};
