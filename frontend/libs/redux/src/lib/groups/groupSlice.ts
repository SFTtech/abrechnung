import { Api, Group, GroupInvite, GroupLog, GroupMember, GroupPayload } from "@abrechnung/api";
import { GroupPermissions } from "@abrechnung/types";
import { fromISOString, lambdaComparator } from "@abrechnung/utils";
import { Draft, createAsyncThunk, createSelector, createSlice } from "@reduxjs/toolkit";
import { GroupInfo, GroupSliceState, IRootState, StateStatus } from "../types";
import { addEntity, getGroupScopedState, removeEntity } from "../utils";
import { leaveGroup } from "./actions";
import { useSelector } from "react-redux";

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

const selectGroupSlice = (state: IRootState, groupId: number) =>
    getGroupScopedState<GroupInfo, GroupSliceState>(state.groups, groupId);

const groupSortFn = (lhs: Group, rhs: Group): number => {
    return fromISOString(rhs.last_changed).getTime() - fromISOString(lhs.last_changed).getTime();
};

// selectors
export const selectGroups = createSelector(
    (state: IRootState) => state.groups,
    (state: IRootState, archived: boolean) => archived,
    (state: GroupSliceState, archived: boolean) => {
        return state.groups.ids
            .map((id) => state.groups.byId[id])
            .filter((group) => group.archived === archived)
            .sort(groupSortFn);
    }
);

export const selectGroupIds = (state: IRootState): number[] => {
    return state.groups.groups.ids;
};

export const selectGroupExists = (state: IRootState, groupId: number | undefined): boolean => {
    if (groupId === undefined) {
        return false;
    }
    return state.groups.groups.byId[groupId] !== undefined;
};

const selectGroupById = (state: IRootState, groupId: number): Group | undefined => {
    return state.groups.groups.byId[groupId];
};

export const useGroup = (groupId: number): Group | undefined => {
    return useSelector((state: IRootState) => selectGroupById(state, groupId));
};

export const useGroupCurrencySymbol = (groupId: number): string | undefined => {
    return useSelector((state: IRootState) => selectGroupById(state, groupId)?.currency_symbol);
};

export const selectGroupMember = (state: IRootState, groupId: number, userId: number): GroupMember | undefined => {
    const s = getGroupScopedState<GroupInfo, GroupSliceState>(state.groups, groupId);
    if (s.groupMembers.byId[userId] === undefined) {
        return undefined;
    }
    return s.groupMembers.byId[userId];
};

export const selectGroupMemberIds = (state: IRootState, groupId: number): number[] => {
    const s = getGroupScopedState<GroupInfo, GroupSliceState>(state.groups, groupId);
    return s.groupMembers.ids;
};

export const selectGroupMembers = createSelector(selectGroupSlice, (state: GroupInfo) => {
    return state.groupMembers.ids.map((id) => state.groupMembers.byId[id]);
});

export const selectGroupMemberIdToUsername = createSelector(selectGroupSlice, (s: GroupInfo) => {
    return s.groupMembers.ids.reduce<{ [k: number]: string }>((map, id) => {
        map[id] = s.groupMembers.byId[id].username;
        return map;
    }, {});
});

export const selectGroupMemberStatus = (state: IRootState, groupId: number): StateStatus | undefined => {
    if (state.groups.byGroupId[groupId] === undefined) {
        return undefined;
    }
    return state.groups.byGroupId[groupId].groupMembersStatus;
};

export const selectGroupInvites = createSelector(selectGroupSlice, (s: GroupInfo): GroupInvite[] => {
    return s.groupInvites.ids.map((id) => s.groupInvites.byId[id]);
});

export const selectGroupInviteStatus = (state: IRootState, groupId: number): StateStatus | undefined => {
    if (state.groups.byGroupId[groupId] === undefined) {
        return undefined;
    }
    return state.groups.byGroupId[groupId].groupInvitesStatus;
};

export const selectGroupLogs = createSelector(selectGroupSlice, (s: GroupInfo): GroupLog[] => {
    return s.groupLog.ids.map((id) => s.groupLog.byId[id]).sort(lambdaComparator((t) => t.logged_at, true));
});

export const selectGroupLogStatus = (state: IRootState, groupId: number): StateStatus | undefined => {
    if (state.groups.byGroupId[groupId] === undefined) {
        return undefined;
    }
    return state.groups.byGroupId[groupId].groupLogStatus;
};

// async thunks
export const fetchGroups = createAsyncThunk<Group[], { api: Api }>(
    "fetchGroups",
    async ({ api }) => {
        return await api.client.groups.listGroups();
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
        return await api.client.groups.getGroup({ groupId });
    }
);

export const createGroup = createAsyncThunk<Group, { group: GroupPayload; api: Api }>(
    "createGroup",
    async ({ group, api }) => {
        return await api.client.groups.createGroup({ requestBody: group });
    }
);

export const fetchGroupMembers = createAsyncThunk<GroupMember[], { groupId: number; api: Api }, { state: IRootState }>(
    "fetchGroupMembers",
    async ({ groupId, api }) => {
        return await api.client.groups.listMembers({ groupId });
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

export const fetchGroupLog = createAsyncThunk<GroupLog[], { groupId: number; api: Api }, { state: IRootState }>(
    "fetchGroupLog",
    async ({ groupId, api }) => {
        return await api.client.groups.listLog({ groupId });
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
        return await api.client.groups.listInvites({ groupId });
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

export const updateGroup = createAsyncThunk<
    Group,
    { group: GroupPayload & { id: number }; api: Api },
    { state: IRootState }
>("updateGroup", async ({ group, api }) => {
    const resp = await api.client.groups.updateGroup({ groupId: group.id, requestBody: group });
    return resp;
});

export const updateGroupMemberPrivileges = createAsyncThunk<
    GroupMember,
    { groupId: number; memberId: number; permissions: GroupPermissions; api: Api },
    { state: IRootState }
>("updateGroupMemberPrivileges", async ({ groupId, memberId, permissions, api }) => {
    return await api.client.groups.updateMemberPermissions({
        groupId,
        requestBody: {
            user_id: memberId,
            is_owner: permissions.isOwner,
            can_write: permissions.canWrite,
        },
    });
});

export const deleteGroupInvite = createAsyncThunk<
    void,
    { groupId: number; inviteId: number; api: Api },
    { state: IRootState }
>("deleteGroupInvite", async ({ groupId, inviteId, api }) => {
    await api.client.groups.deleteInvite({ groupId, inviteId });
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
                byId[member.user_id] = member;
                return byId;
            }, {});
            const memberIds = members.map((member) => member.user_id);
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
            const logsById = logs.reduce<{ [k: number]: GroupLog }>((byId, log) => {
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
            state.byGroupId[groupId].groupMembers.byId[member.user_id] = member;
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
