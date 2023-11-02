/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { FileAttachment } from './FileAttachment';
import type { TransactionDetails } from './TransactionDetails';
import type { TransactionPosition } from './TransactionPosition';
import type { TransactionType } from './TransactionType';

export type Transaction = {
    id: number;
    group_id: number;
    type: TransactionType;
    is_wip: boolean;
    last_changed: string;
    committed_details: (TransactionDetails | null);
    pending_details: (TransactionDetails | null);
    committed_positions?: (Array<TransactionPosition> | null);
    pending_positions?: (Array<TransactionPosition> | null);
    committed_files?: (Array<FileAttachment> | null);
    pending_files?: (Array<FileAttachment> | null);
};

