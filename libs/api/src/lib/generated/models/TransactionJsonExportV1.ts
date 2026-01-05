/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* oxlint-disable */
import type { FileAttachmentJsonExportV1 } from "./FileAttachmentJsonExportV1";
import type { TransactionPositionJsonExportV1 } from "./TransactionPositionJsonExportV1";
import type { TransactionType } from "./TransactionType";
export type TransactionJsonExportV1 = {
    id: number;
    type: TransactionType;
    name: string;
    description: string;
    value: number;
    currency_identifier: string;
    currency_conversion_rate: number;
    billed_at: string;
    tags: Array<string>;
    creditor_shares: Record<string, number>;
    debitor_shares: Record<string, number>;
    positions: Array<TransactionPositionJsonExportV1>;
    files: Array<FileAttachmentJsonExportV1>;
};
