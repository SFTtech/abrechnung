import { Api } from "@abrechnung/api";
import { IRootState } from "../types";
import { createAsyncThunkWithErrorHandling } from "../utils";

export const leaveGroup = createAsyncThunkWithErrorHandling<void, { groupId: number; api: Api }, { state: IRootState }>(
    "leaveGroup",
    async ({ groupId, api }) => {
        await api.client.groups.leaveGroup({ groupId });
    }
);

export const archiveGroup = createAsyncThunkWithErrorHandling<
    void,
    { groupId: number; api: Api },
    { state: IRootState }
>("archiveGroup", async ({ groupId, api }) => {
    await api.client.groups.archiveGroup({ groupId });
});

export const unarchiveGroup = createAsyncThunkWithErrorHandling<
    void,
    { groupId: number; api: Api },
    { state: IRootState }
>("unarchiveGroup", async ({ groupId, api }) => {
    await api.client.groups.unarchiveGroup({ groupId });
});
