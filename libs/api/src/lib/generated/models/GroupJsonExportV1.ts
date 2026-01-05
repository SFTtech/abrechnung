/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* oxlint-disable */
import type { ClearingAccountJsonExportV1 } from "./ClearingAccountJsonExportV1";
import type { GroupMetadataExportV1 } from "./GroupMetadataExportV1";
import type { PersonalAccountJsonExportV1 } from "./PersonalAccountJsonExportV1";
import type { TransactionJsonExportV1 } from "./TransactionJsonExportV1";
export type GroupJsonExportV1 = {
    version?: number;
    metadata: GroupMetadataExportV1;
    personal_accounts: Array<PersonalAccountJsonExportV1>;
    events: Array<ClearingAccountJsonExportV1>;
    transactions: Array<TransactionJsonExportV1>;
};
