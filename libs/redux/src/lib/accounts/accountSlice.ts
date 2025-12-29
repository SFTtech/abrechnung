import * as React from "react";
import { AccountType, Api } from "@abrechnung/api";
import { AccountSortMode, getAccountSortFunc } from "@abrechnung/core";
import { Account, BackendAccount, ClearingAccount, PersonalAccount } from "@abrechnung/types";
import { fromISOString, toISODateString } from "@abrechnung/utils";
import { Draft, PayloadAction, createAsyncThunk, createSelector, createSlice } from "@reduxjs/toolkit";
import { leaveGroup } from "../groups";
import { AccountSliceState, AccountState, IRootState, StateStatus } from "../types";
import { addEntity, createAsyncThunkWithErrorHandling, getGroupScopedState, removeEntity } from "../utils";
import { useSelector } from "react-redux";

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
export const selectGroupAccountsStatus = (state: IRootState, groupId: number): StateStatus | undefined => {
    if (!state.accounts.byGroupId[groupId]) {
        return undefined;
    }
    return state.accounts.byGroupId[groupId].status;
};

const selectGroupAccountSlice = (state: IRootState, groupId: number) =>
    getGroupScopedState<AccountState, AccountSliceState>(state.accounts, groupId);

export const selectGroupAccounts = createSelector(
    selectGroupAccountSlice,
    (state: IRootState, groupId: number, type?: AccountType) => type,
    (s: AccountState, type?: AccountType): Account[] => {
        const wipAccounts = s.wipAccounts.ids.map((id) => s.wipAccounts.byId[id]);
        const accounts = s.accounts.ids.filter((id) => !(id in s.wipAccounts.byId)).map((id) => s.accounts.byId[id]);
        const allAccounts = wipAccounts.concat(accounts).filter((acc) => !acc.deleted);
        if (type != null) {
            return allAccounts.filter((a) => a.type === type);
        }
        return allAccounts;
    }
);

export const useGroupAccounts = <T extends AccountType>(
    groupId: number,
    type?: T
): T extends "clearing" ? ClearingAccount[] : T extends "personal" ? PersonalAccount[] : Account[] => {
    return useSelector((state: IRootState) => selectGroupAccounts(state, groupId, type)) as any;
};

const emptyList: string[] = [];

const selectSortedAccounts = createSelector(
    selectGroupAccounts,
    (state: IRootState, groupId: number, type: AccountType | undefined, sortMode: AccountSortMode) => sortMode,
    (state: IRootState, groupId: number, type: AccountType | undefined) => type,
    (
        state: IRootState,
        groupId: number,
        type: AccountType | undefined,
        sortMode: AccountSortMode,
        searchTerm?: string
    ) => searchTerm,
    (
        state: IRootState,
        groupId: number,
        type: AccountType | undefined,
        sortMode: AccountSortMode,
        searchTerm?: string,
        wipAtTop?: boolean
    ) => wipAtTop,
    (
        state: IRootState,
        groupId: number,
        type: AccountType | undefined,
        sortMode: AccountSortMode,
        searchTerm?: string,
        wipAtTop?: boolean,
        tags?: string[]
    ) => tags ?? emptyList,
    (accounts, sortMode, type, searchTerm, wipAtTop, tags) => {
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

export const useSortedAccounts = <T extends AccountType>(
    groupId: number,
    sortMode: AccountSortMode,
    type?: T,
    searchTerm?: string,
    wipAtTop?: boolean,
    tags: string[] = []
): T extends "personal" ? PersonalAccount[] : T extends "clearing" ? ClearingAccount[] : Account[] => {
    return useSelector((state: IRootState) =>
        selectSortedAccounts(state, groupId, type, sortMode, searchTerm, wipAtTop, tags)
    ) as any;
};

const selectAccountById = (state: AccountState, accountId: number) => {
    return state.wipAccounts.byId[accountId] ?? state.accounts.byId[accountId];
};

export const useAccount = (groupId: number, accountId: number) => {
    const s = useSelector((state: IRootState) =>
        getGroupScopedState<AccountState, AccountSliceState>(state.accounts, groupId)
    );

    return React.useMemo(() => {
        return selectAccountById(s, accountId);
    }, [s, accountId]);
};

export const useClearingAccountsInvolvingAccount = (groupId: number, accountId: number): Account[] => {
    const accounts = useGroupAccounts(groupId, "clearing");

    return React.useMemo(() => {
        return accounts.filter((acc) => acc.clearing_shares && acc.clearing_shares[accountId] !== undefined);
    }, [accounts, accountId]);
};

export const selectAccountIdToAccountMap = (state: IRootState, groupId: number): { [k: number]: Account } => {
    const s = getGroupScopedState<AccountState, AccountSliceState>(state.accounts, groupId);
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

export const fetchAccount = createAsyncThunkWithErrorHandling<
    BackendAccount,
    { groupId: number; accountId: number; api: Api },
    { state: IRootState }
>("fetchAccount", async ({ groupId, accountId, api }) => {
    return await api.client.accounts.getAccount({ groupId, accountId });
});

export const saveAccount = createAsyncThunkWithErrorHandling<
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
                requestBody: { tags: [], date_info: null, ...wipAccount },
            });
        } else {
            updatedAccount = await api.client.accounts.updateAccount({
                groupId,
                accountId: wipAccount.id,
                requestBody: { tags: [], date_info: null, ...wipAccount },
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

export const deleteAccount = createAsyncThunkWithErrorHandling<
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
            const backendAccount = await api.client.accounts.deleteAccount({ groupId, accountId });
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
            const account = selectAccountById(state, accountId);
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
        advanceNextLocalAccountId: (sliceState) => {
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

export const { wipAccountUpdated, accountAdded, accountEditStarted, copyAccount, discardAccountChange } =
    accountSlice.actions;

export const { reducer: accountReducer } = accountSlice;
