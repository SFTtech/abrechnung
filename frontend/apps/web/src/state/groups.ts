import { atom, atomFamily, selectorFamily } from "recoil";
import { fetchGroups, fetchInvites, fetchLog, fetchMembers, getUserIDFromToken } from "../core/api";
import { ws } from "../core/websocket";
import { userData } from "./auth";
import { DateTime } from "luxon";
import { toast } from "react-toastify";

const sortGroups = (groups) => {
    return groups.sort((g1, g2) => g1.id > g2.id);
};

export interface Group {
    id: number;
    name: string;
    description: string;
    currency_symbol: string;
    terms: string;
    created_by: number;
}

export const groupList = atom<Array<Group>>({
    key: "groupList",
    effects_UNSTABLE: [
        ({ setSelf }) => {
            // TODO: handle fetch error
            setSelf(
                fetchGroups()
                    .then((groups) => sortGroups(groups))
                    .catch((err) => toast.error(`error when fetching groups: ${err}`))
            );

            const userID = getUserIDFromToken();
            ws.subscribe("group", userID, (subscription_type, { element_id, group_id }) => {
                if (element_id === userID) {
                    fetchGroups().then((result) => setSelf(sortGroups(result)));
                }
            });
            // TODO: handle registration errors

            return () => {
                ws.unsubscribe("group", userID);
            };
        },
    ],
});

export const groupById = atomFamily({
    key: "groupById",
    default: selectorFamily({
        key: "groupById/default",
        get:
            (groupID) =>
            async ({ get }) => {
                const groups = get(groupList);
                return groups.find((group) => group.id === groupID);
            },
    }),
});

export interface GroupMember {
    user_id: number;
    username: string;
    is_owner: boolean;
    can_write: boolean;
    description: string;
    joined_at: string;
    invited_by: number | null;
}

export const currUserPermissions = selectorFamily<GroupMember, number>({
    key: "currUserPermissions",
    get:
        (groupID) =>
        async ({ get }) => {
            const members = get(groupMembers(groupID));
            const currUser = get(userData);
            return members.find((member) => member.user_id === currUser.id);
        },
});

const sortMembers = (members) => {
    return members.sort((m1, m2) => DateTime.fromISO(m1.joined_at) < DateTime.fromISO(m2.joined_at));
};

export const groupMembers = atomFamily<Array<GroupMember>, number>({
    key: "groupMembers",
    effects_UNSTABLE: (groupID) => [
        ({ setSelf }) => {
            setSelf(
                fetchMembers({ groupID: groupID })
                    .then((members) => sortMembers(members))
                    .catch((err) => toast.error(`error when fetching group members: ${err}`))
            );

            ws.subscribe("group_member", groupID, (subscription_type, { user_id, element_id }) => {
                if (element_id === groupID) {
                    fetchMembers({ groupID: element_id })
                        .then((result) => setSelf(sortMembers(result)))
                        .catch((err) => toast.error(`error when updating group members: ${err}`));
                }
            });
            // TODO: handle registration errors

            return () => {
                ws.unsubscribe("group_member", groupID);
            };
        },
    ],
});

export const groupMemberIDsToUsername = selectorFamily<{ [k: number]: string }, number>({
    key: "groupMemberIDsToUsername",
    get:
        (groupID) =>
        async ({ get }) => {
            const members = get(groupMembers(groupID));
            return members.reduce((map, member) => {
                map[member.user_id] = member.username;
                return map;
            }, {});
        },
});

export interface GroupInvite {
    id: number;
    created_by: number;
    single_use: boolean;
    valid_until: string;
    token: string;
    description: string;
    join_as_editor: boolean;
}

export const groupInvites = atomFamily<Array<GroupInvite>, number>({
    key: "groupInvites",
    effects_UNSTABLE: (groupID) => [
        ({ setSelf }) => {
            setSelf(
                fetchInvites({ groupID: groupID }).catch((err) =>
                    toast.error(`error when fetching group invites: ${err}`)
                )
            );

            ws.subscribe("group_invite", groupID, (subscription_type, { invite_id, element_id }) => {
                if (element_id === groupID) {
                    fetchInvites({ groupID: element_id }).then((result) => setSelf(result));
                }
            });
            // TODO: handle registration errors

            return () => {
                ws.unsubscribe("group_invite", groupID);
            };
        },
    ],
});

export interface GroupLog {
    id: number;
    type: string;
    message: string;
    user_id: number;
    logged_at: string;
    affected_user_id: number;
}

export const groupLog = atomFamily<Array<GroupLog>, number>({
    key: "groupLog",
    effects_UNSTABLE: (groupID) => [
        ({ setSelf }) => {
            setSelf(
                fetchLog({ groupID: groupID }).catch((err) => toast.error(`error when fetching group log: ${err}`))
            );

            ws.subscribe("group_log", groupID, (subscription_type, { log_id, element_id }) => {
                if (element_id === groupID) {
                    fetchLog({ groupID: element_id }).then((result) => setSelf(result));
                }
            });
            // TODO: handle registration errors

            return () => {
                ws.unsubscribe("group_log", groupID);
            };
        },
    ],
});
