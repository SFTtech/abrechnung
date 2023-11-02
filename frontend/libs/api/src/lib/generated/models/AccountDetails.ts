/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type AccountDetails = {
    name: string;
    description: string;
    owning_user_id: number | null;
    date_info: string | null;
    deleted: boolean;
    tags: Array<string>;
    clearing_shares?: Record<string, number> | null;
};
