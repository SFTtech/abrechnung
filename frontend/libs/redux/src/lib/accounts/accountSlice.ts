import { Api } from "@abrechnung/api";
import { Account, AccountBase, AccountType } from "@abrechnung/types";
import { createAsyncThunk, createSlice, PayloadAction, Draft } from "@reduxjs/toolkit";
import { AccountSliceState, AccountState, ENABLE_OFFLINE_MODE, IRootState, StateStatus } from "../types";
import { getGroupScopedState } from "../utils";
import memoize from "proxy-memoize";
import { AccountSortMode, getAccountSortFunc } from "@abrechnung/core";
import { leaveGroup } from "../groups";
import { addEntity, removeEntity } from "../utils";

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

export const selectGroupAccountsFilteredInternal = (args: {
    state: AccountSliceState;
    groupId: number;
    type: AccountType;
}): Account[] => {
    const { state, groupId, type } = args;
    const accounts = selectGroupAccountsInternal({ state, groupId });
    return accounts.filter((acc: Account) => acc.type === type);
};

export const selectSortedAccounts = memoize(
    (args: {
        state: AccountSliceState;
        groupId: number;
        sortMode: AccountSortMode;
        type?: AccountType;
        searchTerm?: string;
    }): Account[] => {
        const { state, groupId, type, sortMode, searchTerm } = args;
        const accounts = selectGroupAccountsInternal({ state, groupId });
        const compareFunction = getAccountSortFunc(sortMode);
        // TODO: this has optimization potential
        if (searchTerm) {
            return accounts
                .filter(
                    (a) =>
                        (a.type === undefined || a.type === type) &&
                        (searchTerm === "" ||
                            a.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            a.name.toLowerCase().includes(searchTerm.toLowerCase()))
                )
                .sort(compareFunction);
        } else {
            return accounts.filter((a) => type === undefined || a.type === type).sort(compareFunction);
        }
    }
);

export const selectGroupAccountsFiltered = memoize(selectGroupAccountsFilteredInternal);

export const selectAccountById = memoize(
    (args: { state: AccountSliceState; groupId: number; accountId: number }): Account | undefined => {
        const { state, groupId, accountId } = args;
        const s = getGroupScopedState<AccountState, AccountSliceState>(state, groupId);
        return s.wipAccounts.byId[accountId] ?? s.pendingAccounts.byId[accountId] ?? s.accounts.byId[accountId];
    }
);

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
        return accounts.filter((acc: Account) => acc.owningUserID === userId);
    }
);

export const selectClearingAccountsInvolvingAccounts = memoize(
    (args: { state: AccountSliceState; groupId: number; accountId: number }): Account[] => {
        const { state, groupId, accountId } = args;
        const accounts = selectGroupAccountsFilteredInternal({ state, groupId, type: "clearing" });
        return accounts.filter((acc: Account) => acc.clearingShares && acc.clearingShares[accountId] !== undefined);
    }
);

export const selectAccountIdToNameMap = memoize(
    (args: { state: AccountSliceState; groupId: number }): { [k: number]: string } => {
        const accounts = selectGroupAccountsInternal(args);
        return accounts.reduce<{ [k: number]: string }>((idNameMap, account) => {
            idNameMap[account.id] = account.name;
            return idNameMap;
        }, {});
    }
);

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

export const saveAccount = createAsyncThunk<{ account: Account; isSynced: boolean }, { account: Account; api: Api }>(
    "saveAccount",
    async ({ account, api }) => {
        // TODO: proper root state type
        let updatedAccount: Account;
        let isSynced: boolean;
        if (await api.hasConnection()) {
            updatedAccount = await api.pushAccountChanges(account);
            isSynced = true;
        } else if (ENABLE_OFFLINE_MODE) {
            updatedAccount = account;
            isSynced = false;
        } else {
            throw new Error("no internet connection");
        }
        return {
            account: updatedAccount,
            isSynced: isSynced,
        };
    }
);

export const discardAccountChange = createAsyncThunk<
    { account: Account | undefined; deletedAccount: boolean },
    { groupId: number; accountId: number; api: Api },
    { state: IRootState }
>("discardAccountChange", async ({ groupId, accountId, api }, { getState, dispatch, rejectWithValue }) => {
    const state = getState();
    const s = getGroupScopedState<AccountState, AccountSliceState>(state.accounts, groupId);
    const wipAccount = s.wipAccounts.byId[accountId];
    if (!wipAccount) {
        // const account = s.accounts.byId[accountId];
        // if (account && account.isWip) {
        //     if (await api.hasConnection()) {
        //         const resp = await api.discardAccountChange(accountId);
        //         return { account: resp, deletedAccount: false };
        //     } else {
        //         return rejectWithValue("cannot discard server side changes without an internet connection");
        //     }
        // }

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

export const createAccount = createAsyncThunk<
    { account: Account; isSynced: boolean },
    { account: Omit<AccountBase, "deleted" | "id">; api: Api; keepWip?: boolean },
    { state: IRootState }
>("createAccount", async ({ account, api, keepWip = false }, { getState, dispatch }) => {
    let updatedAccount: Account;
    let isSynced: boolean;
    if (!keepWip && (await api.hasConnection())) {
        updatedAccount = await api.createAccount(account);
        isSynced = true;
    } else if (keepWip || ENABLE_OFFLINE_MODE) {
        // TODO: proper root state type
        const state = getState();
        updatedAccount = {
            id: state.accounts.nextLocalAccountId,
            ...account,
            deleted: false,
            hasLocalChanges: true,
            isWip: keepWip,
            lastChanged: new Date().toISOString(),
        };
        isSynced = false;
        dispatch(advanceNextLocalAccountId());
    } else {
        throw new Error("no internet connection");
    }
    return {
        account: updatedAccount,
        isSynced: isSynced,
    };
});

const accountSlice = createSlice({
    name: "accounts",
    initialState,
    reducers: {
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
            if (createAccount !== undefined) {
                s.wipAccounts.byId[account.id] = {
                    ...currentAccount,
                    ...account,
                    isWip: true,
                    hasLocalChanges: true,
                    lastChanged: new Date().toISOString(),
                };
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
            const state = getGroupScopedState<AccountState, AccountSliceState>(
                sliceState,
                action.meta.arg.account.groupID
            );
            const { account, isSynced } = action.payload;
            const oldAccountID = action.meta.arg.account.id;
            if (isSynced) {
                const wasAlreadyKnown = state.accounts.byId[account.id] !== undefined;
                state.accounts.byId[account.id] = account;
                if (!wasAlreadyKnown) {
                    state.accounts.ids.push(account.id);
                }
                // as we synced the changes we also need to delete potential pending changes
                const wasPending = state.pendingAccounts.byId[oldAccountID] !== undefined;
                if (wasPending) {
                    delete state.pendingAccounts.byId[oldAccountID];
                    state.pendingAccounts.ids = state.pendingAccounts.ids.filter((id) => id !== oldAccountID);
                }
            } else {
                if (oldAccountID !== account.id) {
                    throw new Error("account id change unexpectedly even though account was not synced");
                }
                const wipAccount = state.wipAccounts.byId[account.id];
                if (!wipAccount) {
                    throw new Error("invalid account state, tried to save wip account which was not wip");
                }
                const wasAlreadyPending = state.pendingAccounts.byId[account.id] !== undefined;
                state.pendingAccounts.byId[account.id] = {
                    ...wipAccount,
                };
                if (!wasAlreadyPending) {
                    state.pendingAccounts.ids.push(account.id);
                }
            }
            delete state.wipAccounts.byId[oldAccountID];
            state.wipAccounts.ids = state.wipAccounts.ids.filter((id) => id !== oldAccountID);
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
        builder.addCase(createAccount.fulfilled, (state, action) => {
            const { account, isSynced } = action.payload;
            const s = getGroupScopedState<AccountState, AccountSliceState>(state, account.groupID);
            if (isSynced) {
                s.accounts.byId[account.id] = account;
                s.accounts.ids.push(account.id);
            } else {
                if (account.isWip) {
                    s.wipAccounts.byId[account.id] = account;
                    s.wipAccounts.ids.push(account.id);
                } else {
                    s.pendingAccounts.byId[account.id] = account;
                    s.pendingAccounts.ids.push(account.id);
                }
            }
        });
        builder.addCase(createAccount.rejected, (state, action) => {
            // TODO: do something?
        });
        builder.addCase(leaveGroup.fulfilled, (state, action) => {
            const { groupId } = action.meta.arg;
            delete state.byGroupId[groupId];
        });
    },
});

// local reducers
const { advanceNextLocalAccountId } = accountSlice.actions;

export const { wipAccountUpdated, accountAdded, accountEditStarted, accountsUpdated } = accountSlice.actions;

export const { reducer: accountReducer } = accountSlice;
