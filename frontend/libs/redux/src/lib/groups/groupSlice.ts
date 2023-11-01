import { Api } from "@abrechnung/api";
import { Group, GroupBase, GroupInvite, GroupLogEntry, GroupMember, GroupPermissions } from "@abrechnung/types";
import { lambdaComparator } from "@abrechnung/utils";
import { Draft, createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { memoize } from "proxy-memoize";
import { GroupInfo, GroupSliceState, IRootState, StateStatus } from "../types";
import { addEntity, getGroupScopedState, removeEntity } from "../utils";
import { leaveGroup } from "./actions";

const initialState: GroupSliceState = {
    groups: {
        byId: {},
        ids: [],
    },
    byGroupId: {},
    status: "loading",
    activeInstanceId: 0,
};

const initializeGroupState = (state: Draft<GroupSliceState>, groupId: number) => {
    if (state.byGroupId[groupId]) {
        return;
    }
    state.byGroupId[groupId] = {
        groupMembers: {
            byId: {},
            ids: [],
        },
        groupMembersStatus: "loading",
        groupInvites: {
            byId: {},
            ids: [],
        },
        groupInvitesStatus: "loading",
        groupLog: {
            byId: {},
            ids: [],
        },
        groupLogStatus: "loading",
    };
};

// selectors
export const selectGroups = memoize((args: { state: GroupSliceState }): Group[] => {
    const { state } = args;
    return state.groups.ids.map((id) => state.groups.byId[id]);
});

export const selectGroupIds = memoize((args: { state: GroupSliceState }): number[] => {
    const { state } = args;
    return state.groups.ids;
});

export const selectGroupExists = memoize((args: { state: GroupSliceState; groupId: number | undefined }): boolean => {
    const { state, groupId } = args;
    if (groupId === undefined) {
        return false;
    }
    return state.groups.byId[groupId] !== undefined;
});

const selectGroupByIdInternal = (args: { state: GroupSliceState; groupId: number }): Group | undefined => {
    const { state, groupId } = args;
    return state.groups.byId[groupId];
};

export const selectGroupById = memoize(selectGroupByIdInternal);

export const selectGroupCurrencySymbol = memoize(
    (args: { state: GroupSliceState; groupId: number }): string | undefined => {
        const { state, groupId } = args;
        const group = selectGroupByIdInternal({ state, groupId });
        return group?.currencySymbol;
    }
);

export const selectGroupMember = memoize(
    (args: { state: GroupSliceState; groupId: number; userId: number }): GroupMember | undefined => {
        const { state, groupId, userId } = args;
        const s = getGroupScopedState<GroupInfo, GroupSliceState>(state, groupId);
        if (s.groupMembers.byId[userId] === undefined) {
            return undefined;
        }
        return s.groupMembers.byId[userId];
    }
);

export const selectGroupMemberIds = memoize((args: { state: GroupSliceState; groupId: number }): number[] => {
    const { state, groupId } = args;
    const s = getGroupScopedState<GroupInfo, GroupSliceState>(state, groupId);
    return s.groupMembers.ids;
});

export const selectGroupMembers = memoize((args: { state: GroupSliceState; groupId: number }): GroupMember[] => {
    const { state, groupId } = args;
    const s = getGroupScopedState<GroupInfo, GroupSliceState>(state, groupId);
    return s.groupMembers.ids.map((id) => s.groupMembers.byId[id]);
});

export const selectGroupMemberIdToUsername = memoize(
    (args: { state: GroupSliceState; groupId: number }): { [k: number]: string } => {
        const { state, groupId } = args;
        const s = getGroupScopedState<GroupInfo, GroupSliceState>(state, groupId);
        return s.groupMembers.ids.reduce<{ [k: number]: string }>((map, id) => {
            map[id] = s.groupMembers.byId[id].username;
            return map;
        }, {});
    }
);

export const selectGroupMemberStatus = memoize(
    (args: { state: GroupSliceState; groupId: number }): StateStatus | undefined => {
        const { state, groupId } = args;
        if (state.byGroupId[groupId] === undefined) {
            return undefined;
        }
        return state.byGroupId[groupId].groupMembersStatus;
    }
);

export const selectGroupInviteIds = memoize((args: { state: GroupSliceState; groupId: number }): number[] => {
    const { state, groupId } = args;
    const s = getGroupScopedState<GroupInfo, GroupSliceState>(state, groupId);
    return s.groupInvites.ids;
});

export const selectGroupInvites = memoize((args: { state: GroupSliceState; groupId: number }): GroupInvite[] => {
    const { state, groupId } = args;
    const s = getGroupScopedState<GroupInfo, GroupSliceState>(state, groupId);
    return s.groupInvites.ids.map((id) => s.groupInvites.byId[id]);
});

export const selectGroupInviteStatus = memoize(
    (args: { state: GroupSliceState; groupId: number }): StateStatus | undefined => {
        const { state, groupId } = args;
        if (state.byGroupId[groupId] === undefined) {
            return undefined;
        }
        return state.byGroupId[groupId].groupInvitesStatus;
    }
);

export const selectGroupLogIds = memoize((args: { state: GroupSliceState; groupId: number }): number[] => {
    const { state, groupId } = args;
    const s = getGroupScopedState<GroupInfo, GroupSliceState>(state, groupId);
    return s.groupLog.ids;
});

export const selectGroupLogs = memoize((args: { state: GroupSliceState; groupId: number }): GroupLogEntry[] => {
    const { state, groupId } = args;
    const s = getGroupScopedState<GroupInfo, GroupSliceState>(state, groupId);
    return s.groupLog.ids.map((id) => s.groupLog.byId[id]).sort(lambdaComparator((t) => t.loggedAt, true));
});

export const selectGroupLogStatus = memoize(
    (args: { state: GroupSliceState; groupId: number }): StateStatus | undefined => {
        const { state, groupId } = args;
        if (state.byGroupId[groupId] === undefined) {
            return undefined;
        }
        return state.byGroupId[groupId].groupLogStatus;
    }
);

// async thunks
export const fetchGroups = createAsyncThunk<Group[], { api: Api }>(
    "fetchGroups",
    async ({ api }) => {
        return await api.fetchGroups();
    }
    // {
    //     condition: ({ api }, { getState }): boolean => {
    //         const state = getState();
    //         if (state.groups.status === "initialized") {
    //             return false;
    //         }
    //         return true;
    //     },
    // }
);

export const fetchGroup = createAsyncThunk<Group, { groupId: number; api: Api }, { state: IRootState }>(
    "fetchGroup",
    async ({ groupId, api }) => {
        return await api.fetchGroup(groupId);
    }
);

export const createGroup = createAsyncThunk<Group, { group: Omit<GroupBase, "id">; api: Api }>(
    "createGroup",
    async ({ group, api }) => {
        return await api.createGroup(group);
    }
);

export const fetchGroupMembers = createAsyncThunk<GroupMember[], { groupId: number; api: Api }, { state: IRootState }>(
    "fetchGroupMembers",
    async ({ groupId, api }) => {
        return await api.fetchGroupMembers(groupId);
    }
    // {
    //     condition: ({ groupId }, { getState }): boolean => {
    //         const state = getState();
    //         if (
    //             state.groups.byGroupId[groupId] !== undefined &&
    //             state.groups.byGroupId[groupId].groupMembersStatus === "initialized"
    //         ) {
    //             return false;
    //         }
    //         return true;
    //     },
    // }
);

export const fetchGroupLog = createAsyncThunk<GroupLogEntry[], { groupId: number; api: Api }, { state: IRootState }>(
    "fetchGroupLog",
    async ({ groupId, api }) => {
        return await api.fetchGroupLog(groupId);
    }
    // {
    //     condition: ({ groupId }, { getState }): boolean => {
    //         const state = getState();
    //         if (
    //             state.groups.byGroupId[groupId] !== undefined &&
    //             state.groups.byGroupId[groupId].groupLogStatus === "initialized"
    //         ) {
    //             return false;
    //         }
    //         return true;
    //     },
    // }
);

export const fetchGroupInvites = createAsyncThunk<GroupInvite[], { groupId: number; api: Api }, { state: IRootState }>(
    "fetchGroupInvites",
    async ({ groupId, api }) => {
        return await api.fetchGroupInvites(groupId);
    }
    // {
    //     condition: ({ groupId }, { getState }): boolean => {
    //         const state = getState();
    //         if (
    //             state.groups.byGroupId[groupId] !== undefined &&
    //             state.groups.byGroupId[groupId].groupInvitesStatus === "initialized"
    //         ) {
    //             return false;
    //         }
    //         return true;
    //     },
    // }
);

export const updateGroup = createAsyncThunk<Group, { group: GroupBase; api: Api }, { state: IRootState }>(
    "updateGroup",
    async ({ group, api }) => {
        const resp = await api.updateGroupMetadata(group);
        return resp;
    }
);

export const updateGroupMemberPrivileges = createAsyncThunk<
    GroupMember,
    { groupId: number; memberId: number; permissions: GroupPermissions; api: Api },
    { state: IRootState }
>("updateGroupMemberPrivileges", async ({ groupId, memberId, permissions, api }) => {
    return await api.updateGroupMemberPrivileges({
        groupId,
        userId: memberId,
        isOwner: permissions.isOwner,
        canWrite: permissions.canWrite,
    });
});

export const deleteGroupInvite = createAsyncThunk<
    void,
    { groupId: number; inviteId: number; api: Api },
    { state: IRootState }
>("deleteGroupInvite", async ({ groupId, inviteId, api }) => {
    await api.deleteGroupInvite(groupId, inviteId);
});

const groupSlice = createSlice({
    name: "groups",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder.addCase(fetchGroups.fulfilled, (state, action) => {
            console.log("fetched groups");
            const groups = action.payload;
            // TODO: optimize such that we maybe only update those who have actually changed??
            const byId = groups.reduce<{ [k: number]: Group }>((byId, group) => {
                byId[group.id] = group;
                return byId;
            }, {});
            state.groups.byId = byId;
            state.groups.ids = groups.map((g) => g.id);
            state.status = "initialized";
        });
        builder.addCase(fetchGroup.fulfilled, (state, action) => {
            const group = action.payload;
            if (!state.groups.byId[group.id]) {
                state.groups.ids.push(group.id);
            }
            state.groups.byId[group.id] = group;
        });
        builder.addCase(fetchGroupMembers.pending, (state, action) => {
            initializeGroupState(state, action.meta.arg.groupId);
        });
        builder.addCase(fetchGroupMembers.fulfilled, (state, action) => {
            const { groupId } = action.meta.arg;
            const members = action.payload;
            const membersById = members.reduce<{ [k: number]: GroupMember }>((byId, member) => {
                byId[member.userID] = member;
                return byId;
            }, {});
            const memberIds = members.map((member) => member.userID);
            state.byGroupId[groupId].groupMembers.byId = membersById;
            state.byGroupId[groupId].groupMembers.ids = memberIds;

            state.byGroupId[groupId].groupMembersStatus = "initialized";
        });
        builder.addCase(fetchGroupInvites.fulfilled, (state, action) => {
            const { groupId } = action.meta.arg;
            const invites = action.payload;
            const membersById = invites.reduce<{ [k: number]: GroupInvite }>((byId, invite) => {
                byId[invite.id] = invite;
                return byId;
            }, {});
            const inviteIds = invites.map((invite) => invite.id);
            state.byGroupId[groupId].groupInvites.byId = membersById;
            state.byGroupId[groupId].groupInvites.ids = inviteIds;

            state.byGroupId[groupId].groupInvitesStatus = "initialized";
        });
        builder.addCase(fetchGroupLog.fulfilled, (state, action) => {
            const { groupId } = action.meta.arg;
            const logs = action.payload;
            const logsById = logs.reduce<{ [k: number]: GroupLogEntry }>((byId, log) => {
                byId[log.id] = log;
                return byId;
            }, {});
            const logIds = logs.map((log) => log.id);
            state.byGroupId[groupId].groupLog.byId = logsById;
            state.byGroupId[groupId].groupLog.ids = logIds;

            state.byGroupId[groupId].groupLogStatus = "initialized";
        });
        builder.addCase(updateGroup.fulfilled, (state, action) => {
            const group = action.payload;
            state.groups.byId[group.id] = group;
        });
        builder.addCase(leaveGroup.fulfilled, (state, action) => {
            const { groupId } = action.meta.arg;
            delete state.groups.byId[groupId];
            delete state.byGroupId[groupId];
            state.groups.ids = state.groups.ids.filter((id) => id !== groupId);
        });
        builder.addCase(updateGroupMemberPrivileges.fulfilled, (state, action) => {
            const { groupId } = action.meta.arg;
            const member = action.payload;
            if (state.byGroupId[groupId] === undefined) {
                return;
            }
            // we assume that the member id is already in the id list
            state.byGroupId[groupId].groupMembers.byId[member.userID] = member;
        });
        builder.addCase(deleteGroupInvite.fulfilled, (state, action) => {
            const { groupId, inviteId } = action.meta.arg;
            if (state.byGroupId[groupId] === undefined) {
                return;
            }
            removeEntity(state.byGroupId[groupId].groupInvites, inviteId);
        });
        builder.addCase(createGroup.fulfilled, (state, action) => {
            const group = action.payload;
            addEntity(state.groups, group);
        });
    },
});

//export const {} = groupSlice.actions;

export const { reducer: groupReducer } = groupSlice;
