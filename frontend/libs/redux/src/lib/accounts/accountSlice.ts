import { Api } from "@abrechnung/api";
import { Account, AccountBase, AccountType, PersonalAccount, ClearingAccount } from "@abrechnung/types";
import { createAsyncThunk, createSlice, PayloadAction, Draft } from "@reduxjs/toolkit";
import { AccountSliceState, AccountState, ENABLE_OFFLINE_MODE, IRootState, StateStatus } from "../types";
import { getGroupScopedState } from "../utils";
import memoize from "proxy-memoize";
import { AccountSortMode, getAccountSortFunc } from "@abrechnung/core";
import { fromISOString, toISODateString } from "@abrechnung/utils";
import { leaveGroup } from "../groups";
import { addEntity, removeEntity } from "../utils";
import { number } from "zod";

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
        pendingAccounts: {
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

const getAccountWithWip = (state: AccountState, accountId: number): Account | undefined => {
    return state.wipAccounts.byId[accountId] ?? state.pendingAccounts.byId[accountId] ?? state.accounts.byId[accountId];
};

// selectors
export const selectGroupAccountsStatus = memoize(
    (args: { state: AccountSliceState; groupId: number }): StateStatus | undefined => {
        const { state, groupId } = args;
        if (!state.byGroupId[groupId]) {
            return undefined;
        }
        return state.byGroupId[groupId].status;
    }
);

const selectGroupAccountIdsInternal = (args: { state: AccountSliceState; groupId: number }): number[] => {
    const { state, groupId } = args;
    const s = getGroupScopedState<AccountState, AccountSliceState>(state, groupId);
    // TODO: merge wip changes here
    const sortFunc = getAccountSortFunc("name");
    return s.accounts.ids
        .concat(...s.pendingAccounts.ids.filter((id) => id < 0))
        .concat(...s.wipAccounts.ids.filter((id) => id < 0 && s.pendingAccounts.ids[id] === undefined))
        .filter((id) => {
            const acc = s.wipAccounts.byId[id] ?? s.pendingAccounts.byId[id] ?? s.accounts.byId[id];
            if (acc === undefined) {
                console.log("error, undefined account for id:", id);
                return false;
            }
            return !acc.deleted;
        })
        .sort((id1, id2) =>
            sortFunc(
                s.wipAccounts.byId[id1] ?? s.pendingAccounts.byId[id1] ?? s.accounts.byId[id1],
                s.wipAccounts.byId[id2] ?? s.pendingAccounts.byId[id2] ?? s.accounts.byId[id2]
            )
        );
};

export const selectGroupAccountIds = memoize(selectGroupAccountIdsInternal);

export const selectGroupAccountsInternal = (args: { state: AccountSliceState; groupId: number }): Account[] => {
    const { state, groupId } = args;
    const s = getGroupScopedState<AccountState, AccountSliceState>(state, groupId);
    const accountIds = selectGroupAccountIdsInternal({ state, groupId });
    return accountIds.map((id: number) => s.wipAccounts.byId[id] ?? s.pendingAccounts.byId[id] ?? s.accounts.byId[id]);
};
export const selectGroupAccounts = memoize(selectGroupAccountsInternal);

const selectGroupAccountIdsFilteredInternal = (args: {
    state: AccountSliceState;
    groupId: number;
    type: AccountType;
}): number[] => {
    const { state, groupId, type } = args;
    const s = getGroupScopedState<AccountState, AccountSliceState>(state, groupId);
    const accountIds = selectGroupAccountIdsInternal({ state: state, groupId });
    // TODO: merge wip changes here
    // TODO: memoize for caching
    return accountIds.filter((id: number) => s.accounts.byId[id]?.type === type);
};

export const selectGroupAccountIdsFiltered = memoize(selectGroupAccountIdsFilteredInternal);

export const selectAccountsFilteredCount = memoize(
    (args: { state: AccountSliceState; groupId: number; type: AccountType }): number => {
        const accountIds = selectGroupAccountIdsFilteredInternal(args);
        return accountIds.length;
    }
);

type NarrowedAccount<AccountTypeT extends AccountType> = AccountTypeT extends "personal"
    ? PersonalAccount
    : ClearingAccount;

export const selectGroupAccountsFilteredInternal = <AccountTypeT extends AccountType>(args: {
    state: AccountSliceState;
    groupId: number;
    type: AccountTypeT;
}): NarrowedAccount<AccountTypeT>[] => {
    const { state, groupId, type } = args;
    const accounts = selectGroupAccountsInternal({ state, groupId });
    return accounts.filter((acc: Account) => acc.type === type) as NarrowedAccount<AccountTypeT>[];
};

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
                    fromISOString(a.lastChanged).toDateString().toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (a.type === "clearing" && a.dateInfo && a.dateInfo.includes(searchTerm.toLowerCase()))
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

export const selectGroupAccountsFiltered = memoize(selectGroupAccountsFilteredInternal);

const selectAccountByIdInternal = (args: {
    state: AccountSliceState;
    groupId: number;
    accountId: number;
}): Account | undefined => {
    const { state, groupId, accountId } = args;
    const s = getGroupScopedState<AccountState, AccountSliceState>(state, groupId);
    return s.wipAccounts.byId[accountId] ?? s.pendingAccounts.byId[accountId] ?? s.accounts.byId[accountId];
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
        const accounts = selectGroupAccountsFilteredInternal({ state, groupId, type: "personal" });
        return accounts.filter((acc: Account) => acc.type === "personal" && acc.owningUserID === userId);
    }
);

export const selectClearingAccountsInvolvingAccounts = memoize(
    (args: { state: AccountSliceState; groupId: number; accountId: number }): Account[] => {
        const { state, groupId, accountId } = args;
        const accounts = selectGroupAccountsFilteredInternal({ state, groupId, type: "clearing" });
        return accounts.filter(
            (acc: Account) =>
                acc.type === "clearing" && acc.clearingShares && acc.clearingShares[accountId] !== undefined
        );
    }
);

export const selectAccountIdToNameMapInternal = (args: {
    state: AccountSliceState;
    groupId: number;
}): { [k: number]: string } => {
    const accounts = selectGroupAccountsInternal(args);
    return accounts.reduce<{ [k: number]: string }>((idNameMap, account) => {
        idNameMap[account.id] = account.name;
        return idNameMap;
    }, {});
};

export const selectAccountIdToNameMap = memoize(selectAccountIdToNameMapInternal);

// async thunks
export const fetchAccounts = createAsyncThunk<
    Account[],
    { groupId: number; api: Api; fetchAnyway?: boolean },
    { state: IRootState }
>(
    "fetchAccounts",
    async ({ groupId, api }) => {
        return await api.fetchAccounts(groupId);
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

export const fetchAccount = createAsyncThunk<Account, { accountId: number; api: Api }, { state: IRootState }>(
    "fetchAccount",
    async ({ accountId, api }) => {
        return await api.fetchAccount(accountId);
    }
);

export const saveAccount = createAsyncThunk<
    { oldAccountId: number; account: Account; isSynced: boolean },
    { groupId: number; accountId: number; api: Api },
    { state: IRootState }
>("saveAccount", async ({ groupId, accountId, api }, { getState, rejectWithValue }) => {
    const state = getState();
    const s = getGroupScopedState<AccountState, AccountSliceState>(state.accounts, groupId);
    let wipAccount = s.wipAccounts.byId[accountId];
    if (!wipAccount) {
        wipAccount = s.pendingAccounts.byId[accountId] ?? s.accounts.byId[accountId];
        if (wipAccount === undefined || !wipAccount.isWip) {
            // TODO: maybe cancel action instead of rejecting
            return rejectWithValue("cannot save a account without wip changes");
        }
    }
    let updatedAccount: Account;
    let isSynced: boolean;
    if (await api.hasConnection()) {
        updatedAccount = await api.pushAccountChanges(wipAccount);
        isSynced = true;
    } else if (ENABLE_OFFLINE_MODE) {
        // TODO: IMPLEMENT properly
        updatedAccount = {
            ...wipAccount,
            isWip: false,
            hasLocalChanges: true,
            lastChanged: new Date().toISOString(),
        };
        isSynced = false;
        throw new Error("not implemented fully");
    } else {
        throw new Error("no internet connection");
    }
    return {
        account: updatedAccount,
        isSynced: isSynced,
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
            groupID: groupId,
            type: type,
            name: "",
            description: "",
            owningUserID: null,
            deleted: false,
            hasLocalChanges: true,
            isWip: true,
            lastChanged: new Date().toISOString(),
        };
    } else {
        account = {
            id: accountId,
            groupID: groupId,
            type: type,
            name: "",
            description: "",
            clearingShares: {},
            dateInfo: toISODateString(new Date()),
            tags: [],
            deleted: false,
            hasLocalChanges: true,
            isWip: true,
            lastChanged: new Date().toISOString(),
        };
    }
    dispatch(advanceNextLocalAccountId());
    return { account };
});

export const deleteAccount = createAsyncThunk<
    { account: Account | undefined; isSynced: boolean },
    { groupId: number; accountId: number; api: Api },
    { state: IRootState }
>("deleteAccount", async ({ groupId, accountId, api }, { getState, rejectWithValue }) => {
    const state = getState();
    const s = getGroupScopedState<AccountState, AccountSliceState>(state.accounts, groupId);

    // we are deleting a transaction that is already present on the server, i.e. id > 0
    const account = s.accounts.byId[accountId];
    if (account) {
        if (await api.hasConnection()) {
            const updatedAccount = await api.deleteAccount(accountId);
            return { account: updatedAccount, isSynced: true };
        } else if (ENABLE_OFFLINE_MODE) {
            return {
                account: {
                    ...account,
                    deleted: true,
                    hasLocalChanges: true,
                    isWip: false,
                    lastChanged: new Date().toISOString(),
                },
                isSynced: false,
            };
        } else {
            return rejectWithValue("no internet connection");
        }
    }

    return { account: undefined, isSynced: false };
});

export const discardAccountChange = createAsyncThunk<
    { account: Account | undefined; deletedAccount: boolean },
    { groupId: number; accountId: number; api: Api },
    { state: IRootState }
>("discardAccountChange", async ({ groupId, accountId, api }, { getState, rejectWithValue }) => {
    const state = getState();
    const s = getGroupScopedState<AccountState, AccountSliceState>(state.accounts, groupId);
    const wipAccount = s.wipAccounts.byId[accountId];
    if (!wipAccount) {
        const account = s.accounts.byId[accountId];
        if (account && account.isWip) {
            if (await api.hasConnection()) {
                const resp = await api.discardAccountChange(accountId);
                return { account: resp, deletedAccount: false };
            } else {
                return rejectWithValue("cannot discard server side changes without an internet connection");
            }
        }

        return {
            account: undefined,
            deletedAccount: false,
        };
    }

    return {
        account: undefined,
        deletedAccount: s.accounts.byId[accountId] === undefined && s.pendingAccounts.byId[accountId] === undefined,
    };
});

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
                lastChanged: new Date().toISOString(),
                hasLocalChanges: true,
                hasCommittedChanges: false,
                isWip: true,
            };

            state.wipAccounts.ids.push(newAccountId);
            state.wipAccounts.byId[newAccountId] = newAccount;
        },
        advanceNextLocalAccountId: (sliceState, action: PayloadAction<void>) => {
            sliceState.nextLocalAccountId = sliceState.nextLocalAccountId - 1;
        },
        accountAdded: (sliceState, action: PayloadAction<Account>) => {
            const account = action.payload;
            const state = getGroupScopedState<AccountState, AccountSliceState>(sliceState, account.groupID);
            if (state.accounts.byId[account.id] !== undefined) {
                return;
            }
            state.accounts.ids.push(account.id);
            state.accounts.byId[account.id] = account;
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
            const account = state.pendingAccounts.byId[accountId] ?? state.accounts.byId[accountId];
            state.wipAccounts.ids.push(accountId);
            state.wipAccounts.byId[accountId] = {
                ...account,
                hasLocalChanges: true,
                isWip: true,
            };
        },
        wipAccountUpdated: (sliceState, action: PayloadAction<AccountBase>) => {
            const account = action.payload;
            const s = getGroupScopedState<AccountState, AccountSliceState>(sliceState, account.groupID);
            if (s.wipAccounts.byId[account.id] === undefined) {
                s.wipAccounts.ids.push(account.id);
            }
            const currentAccount = getAccountWithWip(s, account.id);
            if (currentAccount !== undefined && currentAccount.type === account.type) {
                const newAccount: Account = {
                    ...currentAccount,
                    ...account,
                    isWip: true,
                    hasLocalChanges: true,
                    lastChanged: new Date().toISOString(),
                };
                s.wipAccounts.byId[account.id] = newAccount;
            }
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
                byId[account.id] = account;
                return byId;
            }, {});
            s.accounts.byId = byId;
            s.accounts.ids = accounts.map((a) => a.id);
            s.status = "initialized";
        });
        builder.addCase(fetchAccount.fulfilled, (state, action) => {
            const account = action.payload;
            const groupId = account.groupID;
            const s = getGroupScopedState<AccountState, AccountSliceState>(state, groupId);
            if (!s.accounts.byId[account.id]) {
                s.accounts.ids.push(account.id);
            }
            s.accounts.byId[account.id] = account;
        });
        builder.addCase(saveAccount.fulfilled, (sliceState, action) => {
            const s = getGroupScopedState<AccountState, AccountSliceState>(sliceState, action.meta.arg.groupId);
            const { account, isSynced, oldAccountId } = action.payload;
            if (isSynced) {
                addEntity(s.accounts, account);
                removeEntity(s.pendingAccounts, oldAccountId);
            } else {
                addEntity(s.pendingAccounts, account);
            }
            removeEntity(s.wipAccounts, oldAccountId);
        });
        builder.addCase(saveAccount.rejected, (state, action) => {
            // TODO: do something?
        });
        builder.addCase(discardAccountChange.fulfilled, (state, action) => {
            const { groupId, accountId } = action.meta.arg;
            const { account: updatedAccount } = action.payload;
            const s = getGroupScopedState<AccountState, AccountSliceState>(state, groupId);
            if (updatedAccount) {
                addEntity(s.accounts, updatedAccount);
                removeEntity(s.wipAccounts, accountId);
                return;
            }

            removeEntity(s.wipAccounts, accountId);
        });
        builder.addCase(deleteAccount.fulfilled, (state, action) => {
            const { account, isSynced } = action.payload;
            const { groupId, accountId } = action.meta.arg;
            const s = getGroupScopedState<AccountState, AccountSliceState>(state, groupId);
            // account is known by the server, i.e. id > 0
            if (account) {
                if (isSynced) {
                    addEntity(s.accounts, account);
                    removeEntity(s.pendingAccounts, account.id);
                } else {
                    addEntity(s.pendingAccounts, account);
                }
                removeEntity(s.wipAccounts, account.id);
                return;
            }
            // account is only stored locally, we can purge it fully, i.e. id < 0
            removeEntity(s.pendingAccounts, accountId);
            removeEntity(s.wipAccounts, accountId);
        });
        builder.addCase(createAccount.fulfilled, (state, action) => {
            const { account } = action.payload;
            const { groupId } = action.meta.arg;
            const s = getGroupScopedState<AccountState, AccountSliceState>(state, groupId);
            s.wipAccounts.byId[account.id] = account;
            s.wipAccounts.ids.push(account.id);
        });
        builder.addCase(leaveGroup.fulfilled, (state, action) => {
            const { groupId } = action.meta.arg;
            delete state.byGroupId[groupId];
        });
    },
});

// local reducers
const { advanceNextLocalAccountId } = accountSlice.actions;

export const { wipAccountUpdated, accountAdded, accountEditStarted, accountsUpdated, copyAccount } =
    accountSlice.actions;

export const { reducer: accountReducer } = accountSlice;
