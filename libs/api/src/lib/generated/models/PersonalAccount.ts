/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* oxlint-disable */
export type PersonalAccount = {
    id: number;
    group_id: number;
    type: "personal";
    name: string;
    description: string;
    owning_user_id: number | null;
    deleted: boolean;
    last_changed: string;
};
