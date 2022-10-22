import { atom, atomFamily, selectorFamily } from "recoil";
import { api, getUserIDFromToken } from "../core/api";
import { ws } from "../core/websocket";
import { userData } from "./auth";
import { DateTime } from "luxon";
import { toast } from "react-toastify";
import { Group, GroupMember, GroupInvite, GroupLogEntry } from "@abrechnung/types";

const sortGroups = (groups: Group[]): Group[] => {
    return groups.sort((g1, g2) => g1.id - g2.id);
};

export const groupList = atom<Array<Group>>({
    key: "groupList",
    effects_UNSTABLE: [
        ({ setSelf }) => {
            // TODO: handle fetch error
            setSelf(
                api.fetchGroups().then((groups) => sortGroups(groups))
                // .catch((err) => toast.error(`error when fetching groups: ${err}`))
            );

            const userID = getUserIDFromToken();
            ws.subscribe("group", userID, (subscription_type, { element_id, group_id }) => {
                if (element_id === userID) {
                    api.fetchGroups().then((result) => setSelf(sortGroups(result)));
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

export const currUserPermissions = selectorFamily<GroupMember, number>({
    key: "currUserPermissions",
    get:
        (groupID) =>
        async ({ get }) => {
            const members = get(groupMembers(groupID));
            const currUser = get(userData);
            return members.find((member) => member.userID === currUser.id);
        },
});

const sortMembers = (members: GroupMember[]): GroupMember[] => {
    return members.sort(
        (m1, m2) => DateTime.fromISO(m1.joinedAt).toSeconds() - DateTime.fromISO(m2.joinedAt).toSeconds()
    );
};

export const groupMembers = atomFamily<Array<GroupMember>, number>({
    key: "groupMembers",
    effects_UNSTABLE: (groupID) => [
        ({ setSelf }) => {
            // TODO: handle fetch error
            setSelf(
                api.fetchGroupMembers(groupID).then((members) => sortMembers(members))
                // .catch((err) => toast.error(`error when fetching group members: ${err}`))
            );

            ws.subscribe("group_member", groupID, (subscription_type, { user_id, element_id }) => {
                if (element_id === groupID) {
                    api.fetchGroupMembers(element_id)
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
                map[member.userID] = member.username;
                return map;
            }, {});
        },
});

export const groupInvites = atomFamily<Array<GroupInvite>, number>({
    key: "groupInvites",
    effects_UNSTABLE: (groupID) => [
        ({ setSelf }) => {
            setSelf(
                api.fetchGroupInvites(groupID)
                // .catch((err) => toast.error(`error when fetching group invites: ${err}`))
            );

            ws.subscribe("group_invite", groupID, (subscription_type, { invite_id, element_id }) => {
                if (element_id === groupID) {
                    api.fetchGroupInvites(element_id).then((result) => setSelf(result));
                }
            });
            // TODO: handle registration errors

            return () => {
                ws.unsubscribe("group_invite", groupID);
            };
        },
    ],
});

export const groupLog = atomFamily<Array<GroupLogEntry>, number>({
    key: "groupLog",
    effects_UNSTABLE: (groupID) => [
        ({ setSelf }) => {
            setSelf(
                api.fetchGroupLog(groupID)
                // .catch((err) => toast.error(`error when fetching group log: ${err}`))
            );

            ws.subscribe("group_log", groupID, (subscription_type, { log_id, element_id }) => {
                if (element_id === groupID) {
                    api.fetchGroupLog(element_id).then((result) => setSelf(result));
                }
            });
            // TODO: handle registration errors

            return () => {
                ws.unsubscribe("group_log", groupID);
            };
        },
    ],
});
