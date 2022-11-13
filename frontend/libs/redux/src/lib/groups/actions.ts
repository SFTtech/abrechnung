import { createAsyncThunk } from "@reduxjs/toolkit";
import { IRootState } from "../types";
import { Api } from "@abrechnung/api";

export const leaveGroup = createAsyncThunk<void, { groupId: number; api: Api }, { state: IRootState }>(
    "leaveGroup",
    async ({ groupId, api }) => {
        await api.leaveGroup(groupId);
    }
);
