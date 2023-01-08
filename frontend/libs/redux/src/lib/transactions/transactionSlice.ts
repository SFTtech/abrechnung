import { Api } from "@abrechnung/api";
import { computeTransactionBalanceEffect, getTransactionSortFunc, TransactionSortMode } from "@abrechnung/core";
import {
    Purchase,
    Transaction,
    TransactionAttachment,
    TransactionBalanceEffect,
    TransactionBase,
    TransactionContainer,
    TransactionPosition,
} from "@abrechnung/types";
import { toISODateString } from "@abrechnung/utils";
import { createAsyncThunk, createSlice, Draft, PayloadAction } from "@reduxjs/toolkit";
import memoize from "proxy-memoize";
import { leaveGroup } from "../groups";
import {
    ENABLE_OFFLINE_MODE,
    IRootState,
    ITransactionRootState,
    StateStatus,
    TransactionSliceState,
    TransactionState,
} from "../types";
import { addEntity, EntityState, getGroupScopedState, removeEntity } from "../utils";

export const initializeGroupState = (state: Draft<TransactionSliceState>, groupId: number) => {
    if (state.byGroupId[groupId]) {
        return;
    }

    state.byGroupId[groupId] = {
        transactions: {
            byId: {},
            ids: [],
        },
        wipTransactions: {
            byId: {},
            ids: [],
        },
        pendingTransactions: {
            byId: {},
            ids: [],
        },
        positions: {
            byId: {},
            ids: [],
        },
        wipPositions: {
            byId: {},
            ids: [],
        },
        pendingPositions: {
            byId: {},
            ids: [],
        },
        attachments: {
            byId: {},
            ids: [],
        },
        status: "loading",
    };
};

export const selectGroupTransactionsStatus = memoize(
    (args: { state: TransactionSliceState; groupId: number }): StateStatus | undefined => {
        const { state, groupId } = args;
        if (!state.byGroupId[groupId]) {
            return undefined;
        }
        return state.byGroupId[groupId].status;
    }
);

const selectGroupTransactionIdsInternal = (args: { state: TransactionSliceState; groupId: number }): number[] => {
    const t = performance.now();
    const { state, groupId } = args;
    const s = getGroupScopedState<TransactionState, TransactionSliceState>(state, groupId);
    // TODO: merge wip changes here
    const res = s.transactions.ids
        .concat(...s.pendingTransactions.ids.filter((id) => id < 0))
        .concat(...s.wipTransactions.ids.filter((id) => id < 0 && s.pendingTransactions.ids[id] === undefined))
        .filter(
            (id) =>
                !(
                    s.wipTransactions.byId[id]?.deleted ??
                    s.pendingTransactions.byId[id]?.deleted ??
                    s.transactions.byId[id]?.deleted
                )
        );
    console.log("selectGroupTransactionIdsInternal took " + (performance.now() - t) + " milliseconds.");
    return res;
};

export const selectGroupTransactionIds = memoize(selectGroupTransactionIdsInternal, { size: 5 });

export const selectGroupTransactionsInternal = (args: {
    state: TransactionSliceState;
    groupId: number;
}): Transaction[] => {
    const t = performance.now();
    const { state, groupId } = args;
    const s = getGroupScopedState<TransactionState, TransactionSliceState>(state, groupId);
    const transactionIds = selectGroupTransactionIdsInternal({ state, groupId });
    const res = transactionIds.map(
        (id) => s.wipTransactions.byId[id] ?? s.pendingTransactions.byId[id] ?? s.transactions.byId[id]
    );
    console.log("selectGroupTransactionsInternal took " + (performance.now() - t) + " milliseconds.");
    return res;
};
export const selectGroupTransactions = memoize(selectGroupTransactionsInternal, { size: 5 });

export const selectTransactionByIdMap = memoize(
    (args: { state: TransactionSliceState; groupId: number }): { [k: number]: Transaction } => {
        const { state, groupId } = args;
        const s = getGroupScopedState<TransactionState, TransactionSliceState>(state, groupId);
        const transactionIds = selectGroupTransactionIdsInternal({ state, groupId });
        return transactionIds.reduce<{ [k: number]: Transaction }>((map, id) => {
            map[id] = s.wipTransactions.byId[id] ?? s.pendingTransactions.byId[id] ?? s.transactions.byId[id];
            return map;
        }, {});
    }
);

const selectGroupPositionIdsInternal = (args: { state: TransactionSliceState; groupId: number }): number[] => {
    const { state, groupId } = args;
    const s = getGroupScopedState<TransactionState, TransactionSliceState>(state, groupId);
    // TODO: merge wip changes here
    return s.positions.ids
        .concat(...s.pendingPositions.ids.filter((id) => id < 0))
        .concat(...s.wipPositions.ids.filter((id) => id < 0 && s.pendingPositions.ids[id] === undefined))
        .filter(
            (id) =>
                !(
                    s.wipPositions.byId[id]?.deleted ??
                    s.pendingPositions.byId[id]?.deleted ??
                    s.positions.byId[id]?.deleted
                )
        );
};

export const selectGroupPositionIds = memoize(selectGroupPositionIdsInternal, { size: 5 });

export const selectGroupPositionsInternal = (args: {
    state: TransactionSliceState;
    groupId: number;
}): TransactionPosition[] => {
    const { state, groupId } = args;
    const s = getGroupScopedState<TransactionState, TransactionSliceState>(state, groupId);
    const positionIds = selectGroupPositionIdsInternal({ state, groupId });
    return positionIds.map((id) => s.wipPositions.byId[id] ?? s.pendingPositions.byId[id] ?? s.positions.byId[id]);
};

export const selectGroupPositions = memoize(selectGroupPositionsInternal, { size: 5 });

export const selectTransactionPositionMapInternal = (args: {
    state: TransactionSliceState;
    groupId: number;
}): { [k: number]: TransactionPosition[] } => {
    const { state, groupId } = args;
    const transactionIds = selectGroupTransactionIdsInternal(args);
    return transactionIds.reduce<{ [k: number]: TransactionPosition[] }>((map, transactionId) => {
        const positions = selectTransactionPositionsInternal({ state, groupId, transactionId });
        map[transactionId] = positions;
        return map;
    }, {});
};

export const selectTransactionPositionMap = memoize(selectTransactionPositionMapInternal);

const selectTransactionByIdInternal = (args: {
    state: TransactionSliceState;
    groupId: number;
    transactionId: number;
}): Transaction | undefined => {
    const { state, groupId, transactionId } = args;
    const s = getGroupScopedState<TransactionState, TransactionSliceState>(state, groupId);
    return getTransactionWithWip(s, transactionId);
};

export const selectTransactionById = memoize(selectTransactionByIdInternal);

const selectTransactionIsWipInternal = (args: {
    state: TransactionSliceState;
    groupId: number;
    transactionId: number;
}): boolean => {
    const transaction = selectTransactionByIdInternal(args);
    if (!transaction) {
        return false;
    }
    return transaction.isWip;
};

export const selectTransactionIsWip = memoize(selectTransactionIsWipInternal);
export const selectNextLocalPositionId = memoize((args: { state: TransactionSliceState }): number => {
    const { state } = args;
    return state.nextLocalPositionId;
});

export const selectTransactionHasAttachments = memoize(
    (args: { state: TransactionSliceState; groupId: number; transactionId: number }): boolean => {
        const { state, groupId } = args;
        const s = getGroupScopedState<TransactionState, TransactionSliceState>(state, groupId);
        const transaction = selectTransactionByIdInternal(args);
        if (!transaction) {
            return false;
        }

        return transaction.attachments.reduce((isNotDeleted, attachmentId) => {
            return s.attachments.byId[attachmentId].deleted ? isNotDeleted : true;
        }, false);
    }
);

export const selectTransactionAttachments = memoize(
    (args: { state: TransactionSliceState; groupId: number; transactionId: number }): TransactionAttachment[] => {
        const { state, groupId, transactionId } = args;
        const s = getGroupScopedState<TransactionState, TransactionSliceState>(state, groupId);
        const attachmentIds = new Set<number>([
            ...(s.wipTransactions.byId[transactionId]?.attachments ?? []),
            ...(s.transactions.byId[transactionId]?.attachments ?? []),
            ...(s.pendingTransactions.byId[transactionId]?.attachments ?? []),
        ]);
        return Array.from(attachmentIds)
            .map((id) => s.attachments.byId[id])
            .filter((a) => !a.deleted);
    }
);

const selectTransactionPositionIdsInternal = (args: {
    state: TransactionSliceState;
    groupId: number;
    transactionId: number;
}): number[] => {
    const { state, groupId, transactionId } = args;
    const s = getGroupScopedState<TransactionState, TransactionSliceState>(state, groupId);
    const wipTransaction = s.wipTransactions.byId[transactionId];
    const pendingTransaction = s.pendingTransactions.byId[transactionId];
    const transaction = s.transactions.byId[transactionId];
    if (
        (wipTransaction !== undefined && wipTransaction.type !== "purchase") ||
        (pendingTransaction !== undefined && pendingTransaction.type !== "purchase") ||
        (transaction !== undefined && transaction.type !== "purchase")
    ) {
        return [];
    }
    const positionIds = new Set<number>([
        ...((wipTransaction as Purchase | undefined)?.positions ?? []), // TODO: FIXME apparently the compiler is not smart enough to get this
        ...((pendingTransaction as Purchase | undefined)?.positions ?? []),
        ...((transaction as Purchase | undefined)?.positions ?? []),
    ]);
    return Array.from(positionIds);
};

const selectTransactionPositionsInternal = (args: {
    state: TransactionSliceState;
    groupId: number;
    transactionId: number;
}): TransactionPosition[] => {
    const { state, groupId, transactionId } = args;
    const s = getGroupScopedState<TransactionState, TransactionSliceState>(state, groupId);
    const positionIds = selectTransactionPositionIdsInternal(args);
    return Array.from(positionIds)
        .map((id) => {
            const pos = s.wipPositions.byId[id] ?? s.pendingPositions.byId[id] ?? s.positions.byId[id];
            if (pos === undefined) {
                console.warn("position is undefined for transaction", transactionId, "position id", id);
            }
            return pos;
        })
        .filter((p) => p && !p.deleted);
};

export const selectTransactionPositions = memoize(selectTransactionPositionsInternal);

export const selectTransactionHasPositions = memoize(
    (args: { state: TransactionSliceState; groupId: number; transactionId: number }): boolean => {
        const positions = selectTransactionPositionsInternal(args);
        return positions.length > 0;
    }
);

export const selectTransactionPositionTotal = memoize(
    (args: { state: TransactionSliceState; groupId: number; transactionId: number }): number => {
        const positions = selectTransactionPositionsInternal(args);
        return positions.reduce((sum, pos) => sum + pos.price, 0);
    }
);

export const selectTransactionPositionsWithEmpty = memoize(
    (args: { state: TransactionSliceState; groupId: number; transactionId: number }): TransactionPosition[] => {
        const { state, transactionId } = args;
        const positions = selectTransactionPositionsInternal(args);
        const isWip = selectTransactionIsWipInternal(args);
        if (isWip) {
            return [
                ...positions,
                {
                    id: state.nextLocalPositionId,
                    transactionID: transactionId,
                    name: "",
                    communistShares: 0,
                    price: 0,
                    usages: {},
                    deleted: false,
                },
            ];
        } else {
            return positions;
        }
    }
);

export const selectTransactionBalanceEffectInternal = (args: {
    state: TransactionSliceState;
    groupId: number;
    transactionId: number;
}): TransactionBalanceEffect | undefined => {
    const transaction = selectTransactionByIdInternal(args);
    if (!transaction) {
        return undefined;
    }
    const positions = selectTransactionPositionsInternal(args);
    return computeTransactionBalanceEffect(transaction, positions);
};

export const selectTransactionBalanceEffect = memoize(selectTransactionBalanceEffectInternal);

export const selectTransactionBalanceEffectsInternal = (args: {
    state: TransactionSliceState;
    groupId: number;
}): { [k: number]: TransactionBalanceEffect } => {
    const s = performance.now();
    const { state, groupId } = args;
    const transactionIds = selectGroupTransactionIdsInternal(args);
    const res = transactionIds.reduce<{ [k: number]: TransactionBalanceEffect }>((map, transactionId) => {
        const balanceEffect = selectTransactionBalanceEffectInternal({ state, groupId, transactionId });
        if (balanceEffect) {
            map[transactionId] = balanceEffect;
        }
        return map;
    }, {});
    console.log("selectTransactionBalanceEffectsInternal took " + (performance.now() - s) + " milliseconds.");
    return res;
};

export const selectTransactionBalanceEffects = memoize(selectTransactionBalanceEffectsInternal);

const selectTransactionIdsInvolvingAccountInternal = (args: {
    state: TransactionSliceState;
    groupId: number;
    accountId: number;
}): number[] => {
    const { state, groupId, accountId } = args;
    const balanceEffects = selectTransactionBalanceEffectsInternal({ state, groupId });
    return Object.entries(balanceEffects)
        .filter(([transactionId, balanceEffect]) => {
            return balanceEffect[accountId] !== undefined;
        })
        .map(([transactionId]) => Number(transactionId));
};

export const selectTransactionIdsInvolvingAccount = memoize(selectTransactionIdsInvolvingAccountInternal);

export const selectTransactionsInvolvingAccount = memoize(
    (args: {
        state: TransactionSliceState;
        groupId: number;
        accountId: number;
        sortMode?: TransactionSortMode;
    }): Transaction[] => {
        const transactionIds = selectTransactionIdsInvolvingAccountInternal(args);
        const { state, groupId, sortMode } = args;
        const s = getGroupScopedState<TransactionState, TransactionSliceState>(state, groupId);
        return transactionIds
            .map((id) => s.wipTransactions.byId[id] ?? s.pendingTransactions.byId[id] ?? s.transactions.byId[id])
            .sort(getTransactionSortFunc(sortMode ?? "lastChanged"));
    }
);

// async thunks
export const fetchTransactions = createAsyncThunk<
    TransactionContainer[],
    { groupId: number; api: Api; fetchAnyway?: boolean },
    { state: IRootState }
>(
    "fetchTransactions",
    async ({ groupId, api }) => {
        return await api.fetchTransactions(groupId);
    },
    {
        condition: ({ groupId, fetchAnyway = false }, { getState }): boolean => {
            if (fetchAnyway) {
                return true;
            }

            const state = getState();
            if (
                state.transactions.byGroupId[groupId] &&
                state.transactions.byGroupId[groupId].status === "initialized"
            ) {
                return false;
            }
            return true;
        },
    }
);

export const fetchTransaction = createAsyncThunk<
    TransactionContainer,
    { transactionId: number; api: Api },
    { state: IRootState }
>("fetchTransaction", async ({ transactionId, api }) => {
    return await api.fetchTransaction(transactionId);
});

export const createTransfer = createAsyncThunk<
    { transaction: Transaction; isSynced: boolean },
    { transaction: Omit<TransactionBase, "deleted" | "id" | "positions" | "attachments">; api: Api; keepWip?: boolean },
    { state: IRootState }
>("createTransfer", async ({ transaction, api, keepWip = false }, { getState, dispatch }) => {
    let updatedTransaction: Transaction;
    let isSynced: boolean;
    if (!keepWip && (await api.hasConnection())) {
        const container = await api.createTransaction(transaction, true);
        updatedTransaction = container.transaction;
        isSynced = true;
    } else if (keepWip || ENABLE_OFFLINE_MODE) {
        // TODO: proper root state type
        const state = getState();
        updatedTransaction = {
            id: state.transactions.nextLocalTransactionId,
            ...transaction,
            positions: [],
            attachments: [],
            deleted: false,
            hasLocalChanges: true,
            isWip: keepWip,
            lastChanged: new Date().toISOString(),
        };
        isSynced = false;
        dispatch(advanceNextLocalTransactionId());
    } else {
        throw new Error("no internet connection");
    }
    return {
        transaction: updatedTransaction,
        isSynced: isSynced,
    };
});

export const createPurchase = createAsyncThunk<
    { transaction: Transaction },
    { groupId: number },
    { state: ITransactionRootState }
>("createPurchase", async ({ groupId }, { getState, dispatch }) => {
    const state = getState();
    const transactionId = state.transactions.nextLocalTransactionId;
    const transaction: Purchase = {
        id: transactionId,
        groupID: groupId,
        type: "purchase",
        name: "",
        description: "",
        value: 0,
        currencyConversionRate: 1.0,
        currencySymbol: "€",
        billedAt: toISODateString(new Date()),
        creditorShares: {},
        debitorShares: {},
        tags: [],
        deleted: false,
        positions: [],
        attachments: [],
        hasLocalChanges: true,
        isWip: true,
        lastChanged: new Date().toISOString(),
    };
    dispatch(advanceNextLocalTransactionId());
    return { transaction };
});

export const saveTransaction = createAsyncThunk<
    {
        oldTransactionId: number;
        oldPositionIds: number[];
        transactionContainer: TransactionContainer;
        isSynced: boolean;
    },
    { groupId: number; transactionId: number; api: Api },
    { state: IRootState }
>("saveTransaction", async ({ groupId, transactionId, api }, { getState, dispatch, rejectWithValue }) => {
    const state = getState();
    const s = getGroupScopedState<TransactionState, TransactionSliceState>(state.transactions, groupId);
    let wipTransaction = s.wipTransactions.byId[transactionId];
    if (!wipTransaction) {
        wipTransaction = s.pendingTransactions.byId[transactionId] ?? s.transactions.byId[transactionId];
        if (wipTransaction === undefined || !wipTransaction.isWip) {
            // TODO: maybe cancel action instead of rejecting
            return rejectWithValue("cannot save a transaction without wip changes");
        }
    }

    // TODO: include pendingPositionChanges for offline mode
    let wipPositionIds: number[] = [];
    let wipPositions: TransactionPosition[] = [];
    if (wipTransaction.type === "purchase") {
        wipPositionIds = wipTransaction.positions.filter((positionId) => s.wipPositions.byId[positionId] !== undefined);
        wipPositions = wipPositionIds.map((positionId) => s.wipPositions.byId[positionId]);
    }

    let updatedTransactionContainer: TransactionContainer;
    let isSynced: boolean;
    if (await api.hasConnection()) {
        updatedTransactionContainer = await api.pushTransactionChanges(wipTransaction, wipPositions, true);
        isSynced = true;
    } else if (ENABLE_OFFLINE_MODE) {
        // TODO: IMPLEMENT properly
        updatedTransactionContainer = {
            transaction: {
                ...wipTransaction,
                hasLocalChanges: true,
                isWip: false,
                lastChanged: new Date().toISOString(),
            },
            positions: [...wipPositions],
            attachments: [],
        };
        isSynced = false;
        throw new Error("not implemented fully");
    } else {
        throw new Error("no internet connection");
    }
    return {
        oldTransactionId: transactionId,
        oldPositionIds: wipPositionIds,
        transactionContainer: updatedTransactionContainer,
        isSynced: isSynced,
    };
});

export const discardTransactionChange = createAsyncThunk<
    { transaction: TransactionContainer | undefined; deletedTransaction: boolean },
    { groupId: number; transactionId: number; api: Api },
    { state: IRootState }
>("discardTransactionChange", async ({ groupId, transactionId, api }, { getState, rejectWithValue }) => {
    const state = getState();
    const s = getGroupScopedState<TransactionState, TransactionSliceState>(state.transactions, groupId);
    const wipTransaction = s.wipTransactions.byId[transactionId];
    if (!wipTransaction) {
        const transaction = s.transactions.byId[transactionId];
        if (transaction && transaction.isWip) {
            if (await api.hasConnection()) {
                const resp = await api.discardTransactionChange(transactionId);
                return { transaction: resp, deletedTransaction: false };
            } else {
                return rejectWithValue("cannot discard server side changes without an internet connection");
            }
        }

        return {
            transaction: undefined,
            deletedTransaction: false,
        };
    }

    return {
        transaction: undefined,
        deletedTransaction:
            s.transactions.byId[transactionId] === undefined && s.pendingTransactions.byId[transactionId] === undefined,
    };
});

export const deleteTransaction = createAsyncThunk<
    { transaction: Transaction | undefined; isSynced: boolean },
    { groupId: number; transactionId: number; api: Api },
    { state: IRootState }
>("deleteTransaction", async ({ groupId, transactionId, api }, { getState, rejectWithValue }) => {
    const state = getState();
    const s = getGroupScopedState<TransactionState, TransactionSliceState>(state.transactions, groupId);

    // we are deleting a transaction that is already present on the server, i.e. id > 0
    const transaction = s.transactions.byId[transactionId];
    if (transaction) {
        if (await api.hasConnection()) {
            const container = await api.deleteTransaction(transactionId);
            return { transaction: container.transaction, isSynced: true };
        } else if (ENABLE_OFFLINE_MODE) {
            return {
                transaction: {
                    ...transaction,
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

    return { transaction: undefined, isSynced: false };
});

export const uploadFile = createAsyncThunk<
    { transaction: Transaction; attachments: TransactionAttachment[] },
    { groupId: number; transactionId: number; file: File; api: Api },
    { state: IRootState }
>("uploadFile", async ({ groupId, transactionId, file, api }, { rejectWithValue }) => {
    if (!(await api.hasConnection())) {
        return rejectWithValue("no internet connection");
    }

    const container = await api.uploadFile(transactionId, file);
    return { transaction: container.transaction, attachments: container.attachments };
});

const initialState: TransactionSliceState = {
    byGroupId: {},
    nextLocalPositionId: -1,
    nextLocalTransactionId: -1,
    activeInstanceId: 0,
};

const getTransactionWithWip = (state: TransactionState, transactionId: number): Transaction | undefined => {
    return (
        state.wipTransactions.byId[transactionId] ??
        state.pendingTransactions.byId[transactionId] ??
        state.transactions.byId[transactionId]
    );
};

const moveTransactionToWip = (s: Draft<TransactionState>, transactionId: number) => {
    if (s.wipTransactions.byId[transactionId] === undefined) {
        const transaction = s.pendingTransactions.byId[transactionId] ?? s.transactions.byId[transactionId];
        s.wipTransactions.byId[transactionId] = {
            ...transaction,
            hasLocalChanges: true,
            isWip: true,
            lastChanged: new Date().toISOString(),
        };
        s.wipTransactions.ids.push(transactionId);
    }
};

const removePositionsForTransaction = (state: EntityState<TransactionPosition>, transactionId: number): void => {
    const positionIds = Object.keys(state.byId).filter((id) => state.byId[Number(id)].transactionID === transactionId);
    for (const id of positionIds) {
        removeEntity(state, Number(id));
    }
};

const updateTransactionLastChanged = (s: Draft<TransactionState>, transactionId: number) => {
    moveTransactionToWip(s, transactionId);
    s.wipTransactions.byId[transactionId].lastChanged = new Date().toISOString();
};

const addPositionToWipTransaction = (s: Draft<TransactionState>, transactionId: number, positionId: number) => {
    moveTransactionToWip(s, transactionId);
    const transaction = s.wipTransactions.byId[transactionId];
    if (transaction && transaction.type === "purchase" && !transaction.positions.includes(positionId)) {
        transaction.positions.push(positionId);
    }
};

const transactionSlice = createSlice({
    name: "transactions",
    initialState,
    reducers: {
        advanceNextLocalTransactionId: (state, action: PayloadAction<void>) => {
            state.nextLocalTransactionId = state.nextLocalTransactionId - 1;
        },
        advanceNextLocalPositionId: (state, action: PayloadAction<void>) => {
            state.nextLocalPositionId = state.nextLocalPositionId - 1;
        },
        transactionEditStarted: (state, action: PayloadAction<{ groupId: number; transactionId: number }>) => {
            const { groupId, transactionId } = action.payload;
            const s = getGroupScopedState<TransactionState, TransactionSliceState>(state, groupId);
            if (s.wipTransactions.byId[transactionId] !== undefined) {
                return;
            }
            const transaction = s.pendingTransactions.byId[transactionId] ?? s.transactions.byId[transactionId];
            s.wipTransactions.ids.push(transactionId);
            s.wipTransactions.byId[transactionId] = {
                ...transaction,
                hasLocalChanges: true,
                isWip: true,
            };
        },
        wipTransactionUpdated: (state, action: PayloadAction<TransactionBase>) => {
            const transaction = action.payload;
            const s = getGroupScopedState<TransactionState, TransactionSliceState>(state, transaction.groupID);
            if (s.wipTransactions.byId[transaction.id] === undefined) {
                s.wipTransactions.ids.push(transaction.id);
            }
            const currentTransaction = getTransactionWithWip(s, transaction.id);
            if (currentTransaction !== undefined) {
                s.wipTransactions.byId[transaction.id] = {
                    ...currentTransaction,
                    ...transaction,
                    isWip: true,
                    hasLocalChanges: true,
                    lastChanged: new Date().toISOString(),
                };
            }
        },
        wipPositionAdded: (
            state,
            action: PayloadAction<{
                groupId: number;
                transactionId: number;
                position: Omit<TransactionPosition, "id" | "transactionID" | "deleted">;
            }>
        ) => {
            const { groupId, transactionId, position } = action.payload;
            const s = getGroupScopedState<TransactionState, TransactionSliceState>(state, groupId);
            const positionId = state.nextLocalPositionId;
            addEntity(s.wipPositions, { ...position, id: positionId, transactionID: transactionId, deleted: false });

            state.nextLocalPositionId = positionId - 1;
            updateTransactionLastChanged(s, transactionId); // this makes sure the transaction exists as wip
            (s.wipTransactions.byId[transactionId] as Purchase).positions.push(positionId); // TODO: FIXME: remove typing hack
        },
        wipPositionUpdated: (
            state,
            action: PayloadAction<{ groupId: number; transactionId: number; position: TransactionPosition }>
        ) => {
            const { groupId, position, transactionId } = action.payload;
            const s = getGroupScopedState<TransactionState, TransactionSliceState>(state, groupId);
            if (position.id === state.nextLocalPositionId) {
                // we updated the empty position in the list
                state.nextLocalPositionId = state.nextLocalPositionId - 1;
                addPositionToWipTransaction(s, transactionId, position.id);
            }
            addEntity(s.wipPositions, position);
            updateTransactionLastChanged(s, transactionId);
        },
        positionDeleted: (
            state,
            action: PayloadAction<{ groupId: number; transactionId: number; positionId: number }>
        ) => {
            const { groupId, positionId, transactionId } = action.payload;
            const s = getGroupScopedState<TransactionState, TransactionSliceState>(state, groupId);
            if (s.pendingPositions.byId[positionId] === undefined && s.positions.byId[positionId] === undefined) {
                removeEntity(s.wipPositions, positionId);
                moveTransactionToWip(s, transactionId);
                const transaction = s.wipTransactions.byId[transactionId];
                if (transaction.type === "purchase") {
                    transaction.positions = transaction.positions.filter((id) => id !== positionId);
                }
            } else {
                const position = s.pendingPositions.byId[positionId] ?? s.positions.byId[positionId];
                addEntity(s.wipPositions, { ...position, deleted: true });
            }
            updateTransactionLastChanged(s, transactionId);
        },
    },
    extraReducers: (builder) => {
        builder.addCase(fetchTransactions.pending, (state, action) => {
            const groupId = action.meta.arg.groupId;
            if (!state.byGroupId[groupId]) {
                // TODO: add separate base action to do this
                initializeGroupState(state, groupId);
            }
        });
        builder.addCase(fetchTransactions.rejected, (state, action) => {
            const s = getGroupScopedState<TransactionState, TransactionSliceState>(state, action.meta.arg.groupId);
            s.status = "failed";
            // TODO: proper error handling here, we might also want to initialize the group state in order for other components to not fail
        });
        builder.addCase(fetchTransactions.fulfilled, (state, action) => {
            const transactionContainers = action.payload;
            const groupId = action.meta.arg.groupId;
            const s = getGroupScopedState<TransactionState, TransactionSliceState>(state, groupId);
            // TODO: optimize such that we maybe only update those who have actually changed??
            const transactionsById = transactionContainers.reduce<{ [k: number]: Transaction }>((byId, container) => {
                byId[container.transaction.id] = container.transaction;
                return byId;
            }, {});
            s.transactions.byId = transactionsById;
            s.transactions.ids = transactionContainers.map((t) => t.transaction.id);

            const positionsbyId = transactionContainers.reduce<{ [k: number]: TransactionPosition }>(
                (byId, container) => {
                    container.positions.forEach((p) => {
                        byId[p.id] = p;
                    });
                    return byId;
                },
                {}
            );
            s.positions.byId = positionsbyId;
            s.positions.ids = transactionContainers.map((t) => t.positions.map((p) => p.id)).flat();

            const attachmentsById = transactionContainers.reduce<{ [k: number]: TransactionAttachment }>(
                (byId, container) => {
                    container.attachments.forEach((a) => {
                        byId[a.id] = a;
                    });
                    return byId;
                },
                {}
            );
            s.attachments.byId = attachmentsById;
            s.attachments.ids = transactionContainers.map((t) => t.attachments.map((a) => a.id)).flat();

            s.status = "initialized";
        });
        builder.addCase(fetchTransaction.fulfilled, (state, action) => {
            const transactionContainer = action.payload;
            const groupId = transactionContainer.transaction.groupID;
            const transactionId = transactionContainer.transaction.id;
            const s = getGroupScopedState<TransactionState, TransactionSliceState>(state, groupId);
            if (!s.transactions.byId[transactionId]) {
                s.transactions.ids.push(transactionId);
            }
            s.transactions.byId[transactionId] = transactionContainer.transaction;
            for (const position of transactionContainer.positions) {
                if (!s.positions.byId[position.id]) {
                    s.positions.ids.push(position.id);
                }
                s.positions.byId[position.id] = position;
            }

            for (const attachment of transactionContainer.attachments) {
                if (!s.attachments.byId[attachment.id]) {
                    s.attachments.ids.push(attachment.id);
                }
                s.attachments.byId[attachment.id] = attachment;
            }
        });
        builder.addCase(createTransfer.fulfilled, (state, action) => {
            const { transaction, isSynced } = action.payload;
            const s = getGroupScopedState<TransactionState, TransactionSliceState>(state, transaction.groupID);
            if (isSynced) {
                addEntity(s.transactions, transaction);
            } else {
                if (transaction.isWip) {
                    addEntity(s.wipTransactions, transaction);
                } else {
                    addEntity(s.pendingTransactions, transaction);
                }
            }
        });
        builder.addCase(saveTransaction.fulfilled, (state, action) => {
            const { oldTransactionId, oldPositionIds, transactionContainer, isSynced } = action.payload;
            const groupId = transactionContainer.transaction.groupID;
            const s = getGroupScopedState<TransactionState, TransactionSliceState>(state, groupId);
            if (isSynced) {
                addEntity(s.transactions, transactionContainer.transaction);
                removeEntity(s.pendingTransactions, oldTransactionId);
                for (const positionId of oldPositionIds) {
                    removeEntity(s.pendingPositions, positionId);
                }
                for (const position of transactionContainer.positions) {
                    addEntity(s.positions, position);
                }
                for (const attachment of transactionContainer.attachments) {
                    addEntity(s.attachments, attachment);
                }
            } else {
                addEntity(s.pendingTransactions, transactionContainer.transaction);
                for (const position of transactionContainer.positions) {
                    addEntity(s.pendingPositions, position);
                }
            }

            removeEntity(s.wipTransactions, oldTransactionId);
            for (const positionId of oldPositionIds) {
                removeEntity(s.wipPositions, positionId); // TODO: make more efficient
            }
        });
        builder.addCase(discardTransactionChange.fulfilled, (state, action) => {
            const { groupId, transactionId } = action.meta.arg;
            const { transaction: updatedTransaction } = action.payload;
            const s = getGroupScopedState<TransactionState, TransactionSliceState>(state, groupId);
            if (updatedTransaction) {
                addEntity(s.transactions, updatedTransaction.transaction);
                for (const position of updatedTransaction.positions) {
                    addEntity(s.positions, position);
                }
                for (const attachment of updatedTransaction.attachments) {
                    addEntity(s.attachments, attachment);
                }
                removeEntity(s.wipTransactions, transactionId);
                removePositionsForTransaction(s.wipPositions, transactionId);
                return;
            }

            removeEntity(s.wipTransactions, transactionId);
            removePositionsForTransaction(s.wipPositions, transactionId);
        });
        builder.addCase(createPurchase.fulfilled, (state, action) => {
            const { transaction } = action.payload;
            const { groupId } = action.meta.arg;
            const s = getGroupScopedState<TransactionState, TransactionSliceState>(state, groupId);
            s.wipTransactions.byId[transaction.id] = transaction;
            s.wipTransactions.ids.push(transaction.id);
        });
        builder.addCase(deleteTransaction.fulfilled, (state, action) => {
            const { transaction, isSynced } = action.payload;
            const { groupId, transactionId } = action.meta.arg;
            const s = getGroupScopedState<TransactionState, TransactionSliceState>(state, groupId);
            // transaction is known by the server, i.e. id > 0
            if (transaction) {
                if (isSynced) {
                    addEntity(s.transactions, transaction);
                    removeEntity(s.pendingTransactions, transaction.id);
                } else {
                    addEntity(s.pendingTransactions, transaction);
                }
                removeEntity(s.wipTransactions, transaction.id);
                removePositionsForTransaction(s.wipPositions, transaction.id);
                return;
            }
            // transaction is only stored locally, we can purge it fully, i.e. id < 0
            removeEntity(s.pendingTransactions, transactionId);
            removeEntity(s.wipTransactions, transactionId);
            removePositionsForTransaction(s.wipPositions, transactionId);
            removePositionsForTransaction(s.pendingPositions, transactionId);
        });
        builder.addCase(leaveGroup.fulfilled, (state, action) => {
            const { groupId } = action.meta.arg;
            delete state.byGroupId[groupId];
        });
        builder.addCase(uploadFile.fulfilled, (state, action) => {
            const { transaction, attachments } = action.payload;
            const s = getGroupScopedState<TransactionState, TransactionSliceState>(state, transaction.groupID);
            addEntity(s.transactions, transaction);
            for (const attachment of attachments) {
                addEntity(s.attachments, attachment);
            }
        });
    },
});

// internal actions
const { advanceNextLocalTransactionId } = transactionSlice.actions;

export const { transactionEditStarted, wipTransactionUpdated, wipPositionUpdated, wipPositionAdded, positionDeleted } =
    transactionSlice.actions;

export const { reducer: transactionReducer } = transactionSlice;
