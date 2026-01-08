/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* oxlint-disable */
import type { FileAttachment } from "./FileAttachment";
import type { SplitMode } from "./SplitMode";
import type { TransactionPosition } from "./TransactionPosition";
import type { TransactionType } from "./TransactionType";
export type Transaction = {
    id: number;
    group_id: number;
    type: TransactionType;
    name: string;
    description: string;
    value: number;
    currency_identifier: string;
    currency_conversion_rate: number;
    billed_at: string;
    tags: Array<string>;
    deleted: boolean;
    creditor_shares: Record<string, number>;
    debitor_shares: Record<string, number>;
    split_mode: SplitMode;
    last_changed: string;
    positions: Array<TransactionPosition>;
    files: Array<FileAttachment>;
};
