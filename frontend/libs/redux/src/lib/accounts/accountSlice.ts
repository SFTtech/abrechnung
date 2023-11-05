import { AccountType, Api } from "@abrechnung/api";
import { AccountSortMode, getAccountSortFunc } from "@abrechnung/core";
import { Account, BackendAccount, ClearingAccount, PersonalAccount } from "@abrechnung/types";
import { fromISOString, toISODateString } from "@abrechnung/utils";
import { Draft, PayloadAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import memoize from "proxy-memoize";
import { leaveGroup } from "../groups";
import { AccountSliceState, AccountState, IRootState, StateStatus } from "../types";
import { addEntity, getGroupScopedState, removeEntity } from "../utils";

const initializeGroupState = (state: Draft<AccountSliceState>, groupId: number) => {
    if (state.byGroupId[groupId]) {
        return;
    }

    state.byGroupId[groupId] = {
        accounts: {
            byId: {},
            ids: [],
        },
        wipAccounts: {
            byId: {},
            ids: [],
        },
        status: "loading",
    };
};

const initialState: AccountSliceState = {
    byGroupId: {},
    nextLocalAccountId: -1,
    activeInstanceId: 0,
};

// selectors
export const selectGroupAccountsStatus = (args: {
    state: AccountSliceState;
    groupId: number;
}): StateStatus | undefined => {
    const { state, groupId } = args;
    if (!state.byGroupId[groupId]) {
        return undefined;
    }
    return state.byGroupId[groupId].status;
};

export const selectGroupAccountsInternal = (args: { state: AccountSliceState; groupId: number }): Account[] => {
    const { state, groupId } = args;
    const s = getGroupScopedState<AccountState, AccountSliceState>(state, groupId);
    const wipAccounts = s.wipAccounts.ids.map((id) => s.wipAccounts.byId[id]);
    const accounts = s.accounts.ids.filter((id) => !(id in s.wipAccounts.byId)).map((id) => s.accounts.byId[id]);
    return wipAccounts.concat(accounts).filter((acc) => !acc.deleted);
};

export const selectGroupAccounts = memoize(selectGroupAccountsInternal);

export const selectClearingAccountsInternal = (args: {
    state: AccountSliceState;
    groupId: number;
}): ClearingAccount[] => {
    const accounts = selectGroupAccountsInternal(args);
    return accounts.filter((acc) => acc.type === "clearing") as ClearingAccount[];
};

export const selectClearingAccounts = memoize(selectClearingAccountsInternal);

export const selectPersonalAccountsInternal = (args: {
    state: AccountSliceState;
    groupId: number;
}): PersonalAccount[] => {
    const accounts = selectGroupAccountsInternal(args);
    return accounts.filter((acc) => acc.type === "personal") as PersonalAccount[];
};

export const selectPersonalAccounts = memoize(selectPersonalAccountsInternal);

export const selectSortedAccounts = memoize(
    (args: {
        state: AccountSliceState;
        groupId: number;
        sortMode: AccountSortMode;
        type?: AccountType;
        searchTerm?: string;
        tags?: string[];
        wipAtTop?: boolean;
    }): Account[] => {
        const { state, groupId, type, sortMode, searchTerm, wipAtTop = false, tags = [] } = args;
        const accounts = selectGroupAccountsInternal({ state, groupId });
        const compareFunction = getAccountSortFunc(sortMode, wipAtTop);
        // TODO: this has optimization potential
        const filterFn = (a: Account): boolean => {
            if (a.type === "clearing" && tags.length > 0 && a.tags) {
                for (const tag of tags) {
                    if (!a.tags.includes(tag)) {
                        return false;
                    }
                }
            }

            if (type !== undefined && a.type !== type) {
                return false;
            }

            if (searchTerm && searchTerm !== "") {
                if (
                    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    a.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    fromISOString(a.last_changed).toDateString().toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (a.type === "clearing" && a.date_info && a.date_info.includes(searchTerm.toLowerCase()))
                ) {
                    return true;
                }
                return false;
            }

            return true;
        };

        return accounts.filter(filterFn).sort(compareFunction);
    }
);

const selectAccountByIdInternal = (args: {
    state: AccountSliceState;
    groupId: number;
    accountId: number;
}): Account | undefined => {
    const { state, groupId, accountId } = args;
    const s = getGroupScopedState<AccountState, AccountSliceState>(state, groupId);
    return s.wipAccounts.byId[accountId] ?? s.accounts.byId[accountId];
};
export const selectAccountById = memoize(selectAccountByIdInternal);

export const selectWipAccountById = memoize(
    (args: { state: AccountSliceState; groupId: number; accountId: number }): Account | undefined => {
        const { state, groupId, accountId } = args;
        const s = getGroupScopedState<AccountState, AccountSliceState>(state, groupId);
        return s.wipAccounts.byId[accountId];
    }
);

export const selectAccountsOwnedByUser = memoize(
    (args: { state: AccountSliceState; groupId: number; userId: number }): Account[] => {
        const { state, groupId, userId } = args;
        const accounts = selectGroupAccountsInternal({ state, groupId });
        return accounts.filter((acc: Account) => acc.type === "personal" && acc.owning_user_id === userId);
    }
);

export const selectClearingAccountsInvolvingAccounts = memoize(
    (args: { state: AccountSliceState; groupId: number; accountId: number }): Account[] => {
        const { state, groupId, accountId } = args;
        const accounts = selectGroupAccountsInternal({ state, groupId });
        return accounts.filter(
            (acc: Account) =>
                acc.type === "clearing" && acc.clearing_shares && acc.clearing_shares[accountId] !== undefined
        );
    }
);

export const selectAccountIdToAccountMap = ({
    state,
    groupId,
}: {
    state: AccountSliceState;
    groupId: number;
}): { [k: number]: Account } => {
    const s = getGroupScopedState<AccountState, AccountSliceState>(state, groupId);
    return s.accounts.byId;
};

// async thunks
export const fetchAccounts = createAsyncThunk<
    BackendAccount[],
    { groupId: number; api: Api; fetchAnyway?: boolean },
    { state: IRootState }
>(
    "fetchAccounts",
    async ({ groupId, api }) => {
        return await api.client.accounts.listAccounts({ groupId });
    },
    {
        condition: ({ groupId, fetchAnyway = false }, { getState }): boolean => {
            if (fetchAnyway) {
                return true;
            }

            const state = getState();
            if (state.accounts.byGroupId[groupId] && state.accounts.byGroupId[groupId].status === "initialized") {
                return false;
            }
            return true;
        },
    }
);

export const fetchAccount = createAsyncThunk<BackendAccount, { accountId: number; api: Api }, { state: IRootState }>(
    "fetchAccount",
    async ({ accountId, api }) => {
        return await api.client.accounts.getAccount({ accountId });
    }
);

export const saveAccount = createAsyncThunk<
    { oldAccountId: number; account: BackendAccount },
    { groupId: number; accountId: number; api: Api },
    { state: IRootState }
>("saveAccount", async ({ groupId, accountId, api }, { getState, rejectWithValue }) => {
    const state = getState();
    const s = getGroupScopedState<AccountState, AccountSliceState>(state.accounts, groupId);
    const wipAccount = s.wipAccounts.byId[accountId];
    if (!wipAccount) {
        return rejectWithValue("cannot save a account without wip changes");
    }
    let updatedAccount: BackendAccount;
    if (await api.hasConnection()) {
        if (wipAccount.id < 0) {
            updatedAccount = await api.client.accounts.createAccount({
                groupId,
                requestBody: { owning_user_id: null, tags: [], date_info: null, ...wipAccount },
            });
        } else {
            updatedAccount = await api.client.accounts.updateAccount({
                accountId: wipAccount.id,
                requestBody: { owning_user_id: null, tags: [], date_info: null, ...wipAccount },
            });
        }
    } else {
        throw new Error("no internet connection");
    }
    return {
        account: updatedAccount,
        oldAccountId: accountId,
    };
});

export const createAccount = createAsyncThunk<
    { account: Account },
    { groupId: number; type: AccountType },
    { state: IRootState }
>("createAccount", async ({ groupId, type }, { getState, dispatch }) => {
    const state = getState();
    const accountId = state.accounts.nextLocalAccountId;
    let account: Account;
    if (type === "personal") {
        account = {
            id: accountId,
            group_id: groupId,
            type: type,
            name: "",
            description: "",
            owning_user_id: null,
            deleted: false,
            is_wip: true,
            last_changed: new Date().toISOString(),
        };
    } else {
        account = {
            id: accountId,
            group_id: groupId,
            type: type,
            name: "",
            description: "",
            clearing_shares: {},
            date_info: toISODateString(new Date()),
            tags: [],
            deleted: false,
            is_wip: true,
            last_changed: new Date().toISOString(),
        };
    }
    dispatch(advanceNextLocalAccountId());
    return { account };
});

export const deleteAccount = createAsyncThunk<
    { account: BackendAccount | undefined },
    { groupId: number; accountId: number; api: Api },
    { state: IRootState }
>("deleteAccount", async ({ groupId, accountId, api }, { getState, rejectWithValue }) => {
    const state = getState();
    const s = getGroupScopedState<AccountState, AccountSliceState>(state.accounts, groupId);

    // we are deleting a transaction that is already present on the server, i.e. id > 0
    const account = s.accounts.byId[accountId];
    if (account) {
        if (await api.hasConnection()) {
            const backendAccount = await api.client.accounts.deleteAccount({ accountId });
            return { account: backendAccount };
        } else {
            return rejectWithValue("no internet connection");
        }
    }

    return { account: undefined };
});

const moveAccountToWip = (s: Draft<AccountState>, accountId: number): Account | undefined => {
    if (s.wipAccounts.byId[accountId] === undefined) {
        const account = s.accounts.byId[accountId];
        let wipAccount: Account;
        if (account.type === "clearing") {
            wipAccount = {
                id: account.id,
                group_id: account.group_id,
                name: account.name,
                description: account.description,
                tags: account.tags,
                type: "clearing",
                deleted: account.deleted,
                clearing_shares: account.clearing_shares,
                is_wip: true,
                last_changed: new Date().toISOString(),
                date_info: account.date_info,
            };
        } else {
            wipAccount = {
                id: account.id,
                group_id: account.group_id,
                name: account.name,
                description: account.description,
                type: "personal",
                deleted: account.deleted,
                is_wip: true,
                last_changed: new Date().toISOString(),
                owning_user_id: account.owning_user_id,
            };
        }
        s.wipAccounts.byId[accountId] = wipAccount;
        s.wipAccounts.ids.push(accountId);
        return wipAccount;
    }
    return s.wipAccounts.byId[accountId];
};

const accountSlice = createSlice({
    name: "accounts",
    initialState,
    reducers: {
        copyAccount: (sliceState, action: PayloadAction<{ groupId: number; accountId: number }>) => {
            const { groupId, accountId } = action.payload;
            const state = getGroupScopedState<AccountState, AccountSliceState>(sliceState, groupId);
            const account = selectAccountByIdInternal({ state: sliceState, groupId, accountId });
            if (!account) {
                return;
            }
            const newAccountId = sliceState.nextLocalAccountId;
            sliceState.nextLocalAccountId = sliceState.nextLocalAccountId - 1;

            const newAccount: Account = {
                ...account,
                name: `${account.name} - Copy`,
                id: newAccountId,
                last_changed: new Date().toISOString(),
                is_wip: true,
            };

            addEntity(state.wipAccounts, newAccount);
        },
        advanceNextLocalAccountId: (sliceState, action: PayloadAction<void>) => {
            sliceState.nextLocalAccountId = sliceState.nextLocalAccountId - 1;
        },
        accountAdded: (sliceState, action: PayloadAction<Account>) => {
            const account = action.payload;
            const state = getGroupScopedState<AccountState, AccountSliceState>(sliceState, account.group_id);
            if (state.accounts.byId[account.id] !== undefined) {
                return;
            }
            addEntity(state.accounts, account);
        },
        accountsUpdated: (state, action: PayloadAction<Account[]>) => {
            // TODO: implement
        },
        accountEditStarted: (sliceState, action: PayloadAction<{ groupId: number; accountId: number }>) => {
            const { groupId, accountId } = action.payload;
            const state = getGroupScopedState<AccountState, AccountSliceState>(sliceState, groupId);
            if (state.wipAccounts.byId[accountId] !== undefined || state.accounts.byId[accountId] === undefined) {
                return;
            }
            moveAccountToWip(state, accountId);
        },
        wipAccountUpdated: (
            sliceState,
            action: PayloadAction<
                Partial<Omit<Account, "type" | "last_changed" | "is_wip">> & Pick<Account, "id" | "group_id">
            >
        ) => {
            const account = action.payload;
            const s = getGroupScopedState<AccountState, AccountSliceState>(sliceState, account.group_id);
            if (s.wipAccounts.byId[account.id] === undefined) {
                s.wipAccounts.ids.push(account.id);
            }
            const wipAccount = moveAccountToWip(s, account.id);
            if (!wipAccount) {
                return;
            }
            s.wipAccounts.byId[account.id] = {
                ...wipAccount,
                ...account,
                last_changed: new Date().toISOString(),
            };
        },
        discardAccountChange: (state, action: PayloadAction<{ groupId: number; accountId: number }>) => {
            const { groupId, accountId } = action.payload;
            const s = getGroupScopedState<AccountState, AccountSliceState>(state, groupId);
            removeEntity(s.wipAccounts, accountId);
        },
    },
    extraReducers: (builder) => {
        builder.addCase(fetchAccounts.pending, (state, action) => {
            const groupId = action.meta.arg.groupId;
            if (!state.byGroupId[groupId]) {
                // TODO: add separate base action to do this
                initializeGroupState(state, groupId);
            }
        });
        builder.addCase(fetchAccounts.rejected, (state, action) => {
            const s = getGroupScopedState<AccountState, AccountSliceState>(state, action.meta.arg.groupId);
            s.status = "failed";
        });
        builder.addCase(fetchAccounts.fulfilled, (state, action) => {
            const accounts = action.payload;
            const groupId = action.meta.arg.groupId;
            if (!state.byGroupId[groupId]) {
                // TODO: add separate base action to do this
                initializeGroupState(state, groupId);
            }
            const s = getGroupScopedState<AccountState, AccountSliceState>(state, groupId);
            // TODO: optimize such that we maybe only update those who have actually changed??
            const byId = accounts.reduce<{ [k: number]: Account }>((byId, account) => {
                byId[account.id] = { ...account, is_wip: false };
                return byId;
            }, {});
            s.accounts.byId = byId;
            s.accounts.ids = accounts.map((a) => a.id);
            s.status = "initialized";
        });
        builder.addCase(fetchAccount.fulfilled, (state, action) => {
            const account = action.payload;
            const groupId = account.group_id;
            const s = getGroupScopedState<AccountState, AccountSliceState>(state, groupId);
            addEntity(s.accounts, account);
        });
        builder.addCase(saveAccount.fulfilled, (sliceState, action) => {
            const s = getGroupScopedState<AccountState, AccountSliceState>(sliceState, action.meta.arg.groupId);
            const { account, oldAccountId } = action.payload;
            addEntity(s.accounts, { ...account, is_wip: false });
            removeEntity(s.wipAccounts, oldAccountId);
        });
        builder.addCase(createAccount.fulfilled, (state, action) => {
            const { account } = action.payload;
            const { groupId } = action.meta.arg;
            const s = getGroupScopedState<AccountState, AccountSliceState>(state, groupId);
            addEntity(s.wipAccounts, account);
        });
        builder.addCase(deleteAccount.fulfilled, (state, action) => {
            const { account } = action.payload;
            const { groupId, accountId } = action.meta.arg;
            const s = getGroupScopedState<AccountState, AccountSliceState>(state, groupId);
            // account is known by the server, i.e. id > 0
            if (account) {
                addEntity(s.accounts, account);
            }
            removeEntity(s.wipAccounts, accountId);
        });
        builder.addCase(leaveGroup.fulfilled, (state, action) => {
            const { groupId } = action.meta.arg;
            delete state.byGroupId[groupId];
        });
    },
});

// local reducers
const { advanceNextLocalAccountId } = accountSlice.actions;

export const {
    wipAccountUpdated,
    accountAdded,
    accountEditStarted,
    accountsUpdated,
    copyAccount,
    discardAccountChange,
} = accountSlice.actions;

export const { reducer: accountReducer } = accountSlice;
