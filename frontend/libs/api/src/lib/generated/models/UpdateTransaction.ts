/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { NewFile } from './NewFile';
import type { NewTransactionPosition } from './NewTransactionPosition';
import type { TransactionPosition } from './TransactionPosition';
import type { TransactionType } from './TransactionType';
import type { UpdateFile } from './UpdateFile';
export type UpdateTransaction = {
    type: TransactionType;
    name: string;
    description: string;
    value: number;
    currency_symbol: string;
    currency_conversion_rate: number;
    billed_at: string;
    tags?: Array<string>;
    creditor_shares: Record<string, number>;
    debitor_shares: Record<string, number>;
    new_files?: Array<NewFile>;
    new_positions?: Array<NewTransactionPosition>;
    changed_files?: Array<UpdateFile>;
    changed_positions?: Array<TransactionPosition>;
};

