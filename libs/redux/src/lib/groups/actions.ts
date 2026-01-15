import { Api, Group } from "@abrechnung/api";
import { IRootState } from "../types";
import { createAsyncThunkWithErrorHandling } from "../utils";
import { fetchGroup } from "./groupSlice";

export const leaveGroup = createAsyncThunkWithErrorHandling<void, { groupId: number; api: Api }, { state: IRootState }>(
    "leaveGroup",
    async ({ groupId, api }) => {
        await api.client.groups.leaveGroup({ groupId });
    }
);

export const archiveGroup = createAsyncThunkWithErrorHandling<
    Group,
    { groupId: number; api: Api },
    { state: IRootState }
>("archiveGroup", async ({ groupId, api }, { dispatch }) => {
    await api.client.groups.archiveGroup({ groupId });
    const group = await dispatch(fetchGroup({ groupId, api })).unwrap();
    return group;
});

export const unarchiveGroup = createAsyncThunkWithErrorHandling<
    Group,
    { groupId: number; api: Api },
    { state: IRootState }
>("unarchiveGroup", async ({ groupId, api }, { dispatch }) => {
    await api.client.groups.unarchiveGroup({ groupId });
    const group = await dispatch(fetchGroup({ groupId, api })).unwrap();
    return group;
});
