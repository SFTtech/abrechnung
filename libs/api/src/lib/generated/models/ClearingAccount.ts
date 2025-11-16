/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* oxlint-disable */
export type ClearingAccount = {
    id: number;
    group_id: number;
    type: "clearing";
    name: string;
    description: string;
    date_info: string;
    tags: Array<string>;
    clearing_shares: Record<string, number>;
    last_changed: string;
    deleted: boolean;
};
