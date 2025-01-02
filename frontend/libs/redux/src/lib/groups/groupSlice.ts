import { Api, Group, GroupMember, GroupPayload } from "@abrechnung/api";
import { GroupPermissions } from "@abrechnung/types";
import { fromISOString } from "@abrechnung/utils";
import { Draft, createAsyncThunk, createSelector, createSlice } from "@reduxjs/toolkit";
import { GroupSliceState, IRootState, StateStatus } from "../types";
import { addEntity, getGroupScopedState, removeEntity } from "../utils";
import { leaveGroup } from "./actions";
import { useSelector } from "react-redux";

const initialState: GroupSliceState = {
    groups: {
        byId: {},
        ids: [],
    },
    status: "loading",
    activeInstanceId: 0,
};

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

export const updateGroup = createAsyncThunk<
    Group,
    { group: GroupPayload & { id: number }; api: Api },
    { state: IRootState }
>("updateGroup", async ({ group, api }) => {
    const resp = await api.client.groups.updateGroup({ groupId: group.id, requestBody: group });
    return resp;
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
        builder.addCase(updateGroup.fulfilled, (state, action) => {
            const group = action.payload;
            state.groups.byId[group.id] = group;
        });
        builder.addCase(leaveGroup.fulfilled, (state, action) => {
            const { groupId } = action.meta.arg;
            delete state.groups.byId[groupId];
            state.groups.ids = state.groups.ids.filter((id) => id !== groupId);
        });
        builder.addCase(createGroup.fulfilled, (state, action) => {
            const group = action.payload;
            addEntity(state.groups, group);
        });
    },
});

//export const {} = groupSlice.actions;

export const { reducer: groupReducer } = groupSlice;
