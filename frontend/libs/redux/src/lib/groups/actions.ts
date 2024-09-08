import { Api } from "@abrechnung/api";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { IRootState } from "../types";

export const leaveGroup = createAsyncThunk<void, { groupId: number; api: Api }, { state: IRootState }>(
    "leaveGroup",
    async ({ groupId, api }) => {
        await api.client.groups.leaveGroup({ groupId });
    }
);

export const archiveGroup = createAsyncThunk<void, { groupId: number; api: Api }, { state: IRootState }>(
    "archiveGroup",
    async ({ groupId, api }) => {
        await api.client.groups.archiveGroup({ groupId });
    }
);

export const unarchiveGroup = createAsyncThunk<void, { groupId: number; api: Api }, { state: IRootState }>(
    "unarchiveGroup",
    async ({ groupId, api }) => {
        await api.client.groups.unarchiveGroup({ groupId });
    }
);
