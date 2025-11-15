/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Session } from "./Session";
export type User = {
    id: number;
    username: string;
    email: string;
    registered_at: string;
    deleted: boolean;
    pending: boolean;
    sessions: Array<Session>;
    is_guest_user: boolean;
};
