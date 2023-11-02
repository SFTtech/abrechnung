/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type CreateAccountPayload = {
    name: string;
    description: string;
    date_info?: (string | null);
    tags?: (Array<string> | null);
    owning_user_id?: (number | null);
    clearing_shares?: (Record<string, number> | null);
    type: string;
};

