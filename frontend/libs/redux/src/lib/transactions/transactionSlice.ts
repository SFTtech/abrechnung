import {
    Api,
    NewFile,
    NewTransactionPosition,
    Transaction as BackendTransaction,
    TransactionPosition as BackendTransactionPosition,
    UpdateFile,
} from "@abrechnung/api";
import { computeTransactionBalanceEffect, getTransactionSortFunc, TransactionSortMode } from "@abrechnung/core";
import {
    FileAttachment,
    Transaction,
    TransactionBalanceEffect,
    TransactionPosition,
    TransactionType,
} from "@abrechnung/types";
import { toISODateString } from "@abrechnung/utils";
import { createAsyncThunk, createSelector, createSlice, Draft, PayloadAction } from "@reduxjs/toolkit";
import { leaveGroup } from "../groups";
import { IRootState, StateStatus, TransactionSliceState, TransactionState } from "../types";
import { addEntity, getGroupScopedState, removeEntity } from "../utils";
import { useSelector } from "react-redux";

export const initializeGroupState = (state: Draft<TransactionSliceState>, groupId: number) => {
    if (state.byGroupId[groupId]) {
        return;
    }

    state.byGroupId[groupId] = {
        transactions: {
            byId: {},
            balanceEffects: {},
            ids: [],
        },
        wipTransactions: {
            byId: {},
            balanceEffects: {},
            ids: [],
        },
        status: "loading",
    };
};

const selectGroupTransactionSlice = (state: IRootState, groupId: number) =>
    getGroupScopedState<TransactionState, TransactionSliceState>(state.transactions, groupId);

export const selectGroupTransactionsStatus = (state: IRootState, groupId: number): StateStatus | undefined => {
    if (!state.transactions.byGroupId[groupId]) {
        return undefined;
    }
    return state.transactions.byGroupId[groupId].status;
};

export const selectGroupTransactionsWithoutWip = createSelector(
    selectGroupTransactionSlice,
    (s: TransactionState): Transaction[] => {
        return s.transactions.ids.map((id) => s.transactions.byId[id]).filter((t) => !t.deleted);
    }
);

export const selectGroupTransactionsWithWip = createSelector(selectGroupTransactionSlice, (s: TransactionState) => {
    const transactions = s.transactions.ids
        .filter((id) => !(id in s.wipTransactions.byId))
        .map((id) => s.transactions.byId[id]);
    const wipTransactions = s.wipTransactions.ids.map((id) => s.wipTransactions.byId[id]);
    return transactions.concat(wipTransactions).filter((t) => !t.deleted);
});

export const selectTransactionByIdMap = (state: IRootState, groupId: number): { [k: number]: Transaction } => {
    const s = getGroupScopedState<TransactionState, TransactionSliceState>(state.transactions, groupId);
    return s.transactions.byId;
};

export const selectTransactionById = (
    state: IRootState,
    groupId: number,
    transactionId: number
): Transaction | undefined => {
    const s = getGroupScopedState<TransactionState, TransactionSliceState>(state.transactions, groupId);
    return s.wipTransactions.byId[transactionId] ?? s.transactions.byId[transactionId];
};

export const useTransaction = (groupId: number, transactionId: number): Transaction | undefined => {
    return useSelector((state: IRootState) => selectTransactionById(state, groupId, transactionId));
};

export const selectNextLocalPositionId = (state: TransactionSliceState): number => {
    return state.nextLocalPositionId;
};

const selectWipTransactionPositions = createSelector(
    selectTransactionById,
    (state: IRootState) => state.transactions.nextLocalPositionId,
    (transaction: Transaction | undefined, nextLocalPositionId: number) => {
        if (!transaction) {
            return [];
        }
        const positions =
            transaction?.position_ids.map((id) => transaction.positions[id]).filter((p) => !p.deleted) ?? [];
        if (transaction?.is_wip) {
            return [
                ...positions,
                {
                    id: nextLocalPositionId,
                    name: "",
                    communist_shares: 0,
                    is_changed: false,
                    only_local: true,
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

export const useWipTransactionPositions = (groupId: number, transactionId: number): TransactionPosition[] => {
    return useSelector((state: IRootState) => selectWipTransactionPositions(state, groupId, transactionId));
};

export const selectTransactionHasPositions = createSelector(
    selectTransactionById,
    (transaction: Transaction | undefined): boolean => {
        if (!transaction) {
            return false;
        }
        return transaction.position_ids.reduce<boolean>((acc, id) => {
            return acc || !transaction.positions[id].deleted;
        }, false);
    }
);

export const selectTransactionFiles = createSelector(
    selectTransactionById,
    (transaction: Transaction | undefined): FileAttachment[] => {
        if (!transaction) {
            return [];
        }
        return transaction.file_ids
            .filter((id) => {
                const file = transaction.files[id];
                if (file.type !== "new" && file.deleted) {
                    return false;
                }
                return true;
            })
            .map((id) => transaction.files[id]);
    }
);

export const selectTransactionHasFiles = createSelector(
    selectTransactionById,
    (transaction: Transaction | undefined): boolean => {
        if (!transaction) {
            return false;
        }
        return transaction.file_ids.reduce<boolean>((acc, id) => {
            const file = transaction.files[id];
            if (file.type === "new") {
                return true;
            }
            return acc || !file.deleted;
        }, false);
    }
);

export const selectTransactionBalanceEffect = (
    state: IRootState,
    groupId: number,
    transactionId: number
): TransactionBalanceEffect => {
    const s = getGroupScopedState<TransactionState, TransactionSliceState>(state.transactions, groupId);
    return s.wipTransactions.balanceEffects[transactionId] ?? s.transactions.balanceEffects[transactionId];
};

export const selectTransactionBalanceEffects = (
    state: IRootState,
    groupId: number
): { [k: number]: TransactionBalanceEffect } => {
    const s = getGroupScopedState<TransactionState, TransactionSliceState>(state.transactions, groupId);
    return s.transactions.balanceEffects;
};

export const selectTransactionsInvolvingAccount = createSelector(
    selectGroupTransactionSlice,
    selectTransactionBalanceEffects,
    (state: IRootState, groupId: number, accountId: number) => accountId,
    (state: IRootState, groupId: number, accountId: number, sortMode?: TransactionSortMode) => sortMode,
    (s: TransactionState, balanceEffects, accountId: number, sortMode?: TransactionSortMode): Transaction[] => {
        const transactionIds = Object.entries(balanceEffects)
            .filter(([transactionId, balanceEffect]) => {
                return balanceEffect[accountId] !== undefined;
            })
            .map(([transactionId]) => Number(transactionId));

        return transactionIds
            .map((id) => s.wipTransactions.byId[id] ?? s.transactions.byId[id])
            .filter((t) => !t.deleted)
            .sort(getTransactionSortFunc(sortMode ?? "last_changed"));
    }
);

// async thunks
export const fetchTransactions = createAsyncThunk<
    BackendTransaction[],
    { groupId: number; api: Api; fetchAnyway?: boolean },
    { state: IRootState }
>(
    "fetchTransactions",
    async ({ groupId, api }) => {
        return await api.client.transactions.listTransactions({ groupId });
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
    BackendTransaction,
    { groupId: number; transactionId: number; api: Api },
    { state: IRootState }
>("fetchTransaction", async ({ groupId, transactionId, api }) => {
    return await api.client.transactions.getTransaction({ groupId, transactionId });
});

export const createTransaction = createAsyncThunk<
    { transaction: Transaction },
    {
        groupId: number;
        type: TransactionType;
        data?: Partial<
            Omit<
                Transaction,
                "id" | "type" | "positions" | "group_id" | "is_wip" | "last_changed" | "deleted" | "files"
            >
        >;
    },
    { state: IRootState }
>("createPurchase", async ({ groupId, type, data }, { getState, dispatch }) => {
    const state = getState();
    const transactionId = state.transactions.nextLocalTransactionId;
    const group = state.groups.groups.byId[groupId];
    const transactionBase = {
        id: transactionId,
        group_id: groupId,
        name: "",
        description: "",
        value: 0,
        currency_conversion_rate: 1.0,
        currency_identifier: group.currency_identifier,
        billed_at: toISODateString(new Date()),
        creditor_shares: {},
        debitor_shares: {},
        tags: [],
        positions: {},
        position_ids: [],
        files: {},
        file_ids: [],
        ...data,
        deleted: false,
        last_changed: new Date().toISOString(),
    };
    let transaction: Transaction;
    if (type === "purchase") {
        transaction = {
            ...transactionBase,
            type: "purchase",
            is_wip: true,
        };
    } else {
        transaction = {
            ...transactionBase,
            type: "transfer",
            is_wip: true,
        };
    }
    dispatch(advanceNextLocalTransactionId());
    return { transaction };
});

export const saveTransaction = createAsyncThunk<
    {
        oldTransactionId: number;
        transaction: BackendTransaction;
    },
    { groupId: number; transactionId: number; api: Api },
    { state: IRootState }
>("saveTransaction", async ({ groupId, transactionId, api }, { getState, dispatch, rejectWithValue }) => {
    const state = getState();
    const s = getGroupScopedState<TransactionState, TransactionSliceState>(state.transactions, groupId);
    const wipTransaction = s.wipTransactions.byId[transactionId];
    if (!wipTransaction) {
        return rejectWithValue("cannot save a transaction without wip changes");
    }

    let updatedTransaction: BackendTransaction;
    if (!(await api.hasConnection())) {
        throw new Error("no internet connection");
    }
    const newPositions: NewTransactionPosition[] = Object.values(wipTransaction.positions)
        .filter((p) => p.is_changed && p.only_local)
        .map((p) => ({
            name: p.name,
            communist_shares: p.communist_shares,
            price: p.price,
            usages: p.usages,
        }));
    const changedPositions: BackendTransactionPosition[] = Object.values(wipTransaction.positions)
        .filter((p) => p.is_changed && !p.only_local)
        .map((p) => ({
            id: p.id,
            name: p.name,
            communist_shares: p.communist_shares,
            price: p.price,
            usages: p.usages,
            deleted: p.deleted,
        }));

    const newFiles: NewFile[] = (Object.values(wipTransaction.files).filter((f) => f.type === "new") as NewFile[]).map(
        (f) => ({
            filename: f.filename,
            // strip away the metadata from the base64 string
            content: f.content.includes(",") ? f.content.split(",")[1] : f.content,
            mime_type: f.mime_type,
        })
    );
    const changedFiles: UpdateFile[] = (
        Object.values(wipTransaction.files).filter((f) => f.type === "updated") as UpdateFile[]
    ).map((f) => ({
        id: f.id,
        filename: f.filename,
        deleted: f.deleted,
    }));

    // remove keys we don't want to send to the backend
    const { position_ids, positions, ...body } = wipTransaction;

    if (wipTransaction.id < 0) {
        updatedTransaction = await api.client.transactions.createTransaction({
            groupId,
            requestBody: {
                ...body,
                new_positions: newPositions,
                new_files: newFiles,
            },
        });
    } else {
        updatedTransaction = await api.client.transactions.updateTransaction({
            groupId,
            transactionId: wipTransaction.id,
            requestBody: {
                ...body,
                new_positions: newPositions,
                changed_positions: changedPositions,
                new_files: newFiles,
                changed_files: changedFiles,
            },
        });
    }
    return {
        oldTransactionId: transactionId,
        transaction: updatedTransaction,
    };
});

export const deleteTransaction = createAsyncThunk<
    { transaction: BackendTransaction | undefined },
    { groupId: number; transactionId: number; api: Api },
    { state: IRootState }
>("deleteTransaction", async ({ groupId, transactionId, api }, { getState, rejectWithValue }) => {
    const state = getState();
    const s = getGroupScopedState<TransactionState, TransactionSliceState>(state.transactions, groupId);

    // we are deleting a transaction that is already present on the server, i.e. id > 0
    const transaction = s.transactions.byId[transactionId];
    if (transaction) {
        if (await api.hasConnection()) {
            const backendTransaction = await api.client.transactions.deleteTransaction({ groupId, transactionId });
            return { transaction: backendTransaction };
        } else {
            return rejectWithValue("no internet connection");
        }
    }

    return { transaction: undefined };
});

const initialState: TransactionSliceState = {
    byGroupId: {},
    nextLocalTransactionId: -1,
    nextLocalPositionId: -1,
    nextLocalFileId: -1,
    activeInstanceId: 0,
};

const backendTransactionToTransaction = (t: BackendTransaction): Transaction => {
    return {
        id: t.id,
        group_id: t.group_id,
        type: t.type,
        name: t.name,
        description: t.description,
        creditor_shares: t.creditor_shares,
        debitor_shares: t.debitor_shares,
        currency_identifier: t.currency_identifier,
        currency_conversion_rate: t.currency_conversion_rate,
        billed_at: t.billed_at,
        last_changed: t.last_changed,
        tags: t.tags,
        value: t.value,
        is_wip: false,
        deleted: t.deleted,
        position_ids: t.positions.map((p) => p.id),
        positions: Object.fromEntries(t.positions.map((p) => [p.id, { ...p, is_changed: false, only_local: false }])),
        file_ids: t.files.map((f) => f.id),
        files: Object.fromEntries(t.files.map((f) => [f.id, { ...f, type: "backend" }])),
    };
};

const moveTransactionToWip = (s: Draft<TransactionState>, transactionId: number): Transaction | undefined => {
    if (s.wipTransactions.byId[transactionId] === undefined) {
        const transaction = s.transactions.byId[transactionId];
        const wipTransaction: Transaction = {
            ...transaction,
            is_wip: true,
            last_changed: new Date().toISOString(),
        };
        s.wipTransactions.byId[transactionId] = wipTransaction;
        s.wipTransactions.ids.push(transactionId);
        return wipTransaction;
    }
    return s.wipTransactions.byId[transactionId];
};

const updateTransactionLastChanged = (s: Draft<TransactionState>, transactionId: number) => {
    const wipTransaction = moveTransactionToWip(s, transactionId);
    if (!wipTransaction) {
        return;
    }
    wipTransaction.last_changed = new Date().toISOString();
};

const updateTransactionBalanceEffect = (s: Draft<TransactionState["transactions"]>, transactionId: number) => {
    s.balanceEffects[transactionId] = computeTransactionBalanceEffect(s.byId[transactionId]);
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
        advanceNextLocalFileId: (state, action: PayloadAction<void>) => {
            state.nextLocalFileId = state.nextLocalFileId - 1;
        },
        transactionEditStarted: (state, action: PayloadAction<{ groupId: number; transactionId: number }>) => {
            const { groupId, transactionId } = action.payload;
            const s = getGroupScopedState<TransactionState, TransactionSliceState>(state, groupId);
            if (transactionId in s.wipTransactions.byId) {
                return;
            }
            moveTransactionToWip(s, transactionId);
        },
        wipFileAdded: (state, action: PayloadAction<{ groupId: number; transactionId: number; file: NewFile }>) => {
            const { groupId, transactionId, file } = action.payload;
            const s = getGroupScopedState<TransactionState, TransactionSliceState>(state, groupId);
            const wipTransaction = moveTransactionToWip(s, transactionId);
            if (!wipTransaction) {
                return;
            }
            const fileId = state.nextLocalFileId;
            wipTransaction.file_ids.push(fileId);
            wipTransaction.files[fileId] = {
                id: fileId,
                type: "new",
                ...file,
            };

            state.nextLocalFileId -= 1;
        },
        wipFileUpdated: (
            state,
            action: PayloadAction<{ groupId: number; transactionId: number; file: Omit<UpdateFile, "deleted"> }>
        ) => {
            const { groupId, transactionId, file } = action.payload;
            const s = getGroupScopedState<TransactionState, TransactionSliceState>(state, groupId);
            const wipTransaction = moveTransactionToWip(s, transactionId);
            if (!wipTransaction) {
                return;
            }
            const wipFile = wipTransaction.files[file.id];
            if (!wipFile) {
                return;
            }
            if (wipFile.type === "new") {
                wipTransaction.files[file.id] = {
                    ...wipFile,
                    ...file,
                };
            } else {
                wipTransaction.files[file.id] = {
                    ...wipFile,
                    type: "updated",
                    ...file,
                };
            }
        },
        wipFileDeleted: (state, action: PayloadAction<{ groupId: number; transactionId: number; fileId: number }>) => {
            const { groupId, transactionId, fileId } = action.payload;
            const s = getGroupScopedState<TransactionState, TransactionSliceState>(state, groupId);
            const wipTransaction = moveTransactionToWip(s, transactionId);
            if (!wipTransaction) {
                return;
            }
            const wipFile = wipTransaction.files[fileId];
            if (!wipFile) {
                return;
            }
            if (wipFile.type === "new") {
                wipTransaction.file_ids = wipTransaction.file_ids.filter((id) => id !== fileId);
                delete wipTransaction.files[fileId];
            } else {
                wipTransaction.files[fileId] = {
                    ...wipFile,
                    type: "updated",
                    deleted: true,
                };
            }
        },
        wipTransactionUpdated: (
            state,
            action: PayloadAction<
                Partial<Omit<Transaction, "positions" | "files" | "is_wip" | "last_changed">> &
                    Pick<Transaction, "id" | "group_id">
            >
        ) => {
            const transaction = action.payload;
            const s = getGroupScopedState<TransactionState, TransactionSliceState>(state, transaction.group_id);
            if (s.wipTransactions.byId[transaction.id] === undefined) {
                s.wipTransactions.ids.push(transaction.id);
            }
            const wipTransaction = moveTransactionToWip(s, transaction.id);
            if (!wipTransaction) {
                return;
            }
            s.wipTransactions.byId[transaction.id] = {
                ...wipTransaction,
                ...transaction,
                is_wip: true,
                last_changed: new Date().toISOString(),
            };
            updateTransactionBalanceEffect(s.wipTransactions, transaction.id);
        },
        wipPositionAdded: (
            state,
            action: PayloadAction<{
                groupId: number;
                transactionId: number;
                position: Omit<TransactionPosition, "id" | "deleted">;
            }>
        ) => {
            const { groupId, transactionId, position } = action.payload;
            const s = getGroupScopedState<TransactionState, TransactionSliceState>(state, groupId);
            const wipTransaction = moveTransactionToWip(s, transactionId);
            if (!wipTransaction || wipTransaction.type !== "purchase") {
                return;
            }

            const positionId = state.nextLocalPositionId;
            state.nextLocalPositionId = positionId - 1;
            wipTransaction.position_ids.push(positionId);
            wipTransaction.positions[positionId] = {
                ...position,
                id: positionId,
                deleted: false,
                only_local: true,
                is_changed: true,
            };
            updateTransactionBalanceEffect(s.wipTransactions, wipTransaction.id);
        },
        wipPositionUpdated: (
            state,
            action: PayloadAction<{ groupId: number; transactionId: number; position: TransactionPosition }>
        ) => {
            const { groupId, position, transactionId } = action.payload;
            const s = getGroupScopedState<TransactionState, TransactionSliceState>(state, groupId);
            const wipTransaction = moveTransactionToWip(s, transactionId);
            if (!wipTransaction) {
                return;
            }
            if (position.id === state.nextLocalPositionId) {
                if (
                    position.name === "" &&
                    position.price === 0 &&
                    position.communist_shares === 0 &&
                    Object.keys(position.usages).length === 0
                ) {
                    // in case nothing changed we do nothing
                    return;
                }
                // we updated the empty position in the list
                state.nextLocalPositionId = state.nextLocalPositionId - 1;
            }
            if (!(position.id in wipTransaction.positions)) {
                wipTransaction.position_ids.push(position.id);
                wipTransaction.positions[position.id] = {
                    ...position,
                    is_changed: true,
                };
            } else {
                wipTransaction.positions[position.id] = {
                    ...wipTransaction.positions[position.id],
                    ...position,
                    is_changed: true,
                };
            }
            updateTransactionLastChanged(s, transactionId);
            updateTransactionBalanceEffect(s.wipTransactions, wipTransaction.id);
        },
        positionDeleted: (
            state,
            action: PayloadAction<{ groupId: number; transactionId: number; positionId: number }>
        ) => {
            const { groupId, positionId, transactionId } = action.payload;
            const s = getGroupScopedState<TransactionState, TransactionSliceState>(state, groupId);
            const wipTransaction = moveTransactionToWip(s, transactionId);
            if (!wipTransaction) {
                return;
            }
            if (!(positionId in wipTransaction.positions)) {
                return;
            }
            const position = wipTransaction.positions[positionId];
            if (position.only_local) {
                wipTransaction.position_ids = wipTransaction.position_ids.filter((id) => id !== positionId);
                delete wipTransaction.positions[positionId];
            } else {
                wipTransaction.positions[positionId] = {
                    ...position,
                    deleted: true,
                    is_changed: true,
                };
            }
            updateTransactionLastChanged(s, transactionId);
            updateTransactionBalanceEffect(s.wipTransactions, wipTransaction.id);
        },
        discardTransactionChange: (state, action: PayloadAction<{ groupId: number; transactionId: number }>) => {
            const { groupId, transactionId } = action.payload;
            const s = getGroupScopedState<TransactionState, TransactionSliceState>(state, groupId);
            removeEntity(s.wipTransactions, transactionId);
            delete s.wipTransactions.balanceEffects[transactionId];
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
            const transactions = action.payload;
            const groupId = action.meta.arg.groupId;
            const s = getGroupScopedState<TransactionState, TransactionSliceState>(state, groupId);
            // TODO: optimize such that we maybe only update those who have actually changed??
            s.transactions.byId = transactions.reduce<{ [k: number]: Transaction }>((byId, transaction) => {
                byId[transaction.id] = backendTransactionToTransaction(transaction);
                return byId;
            }, {});
            s.transactions.balanceEffects = Object.values(s.transactions.byId).reduce<{
                [id: number]: TransactionBalanceEffect;
            }>((balanceEffects, transaction) => {
                balanceEffects[transaction.id] = computeTransactionBalanceEffect(transaction);
                return balanceEffects;
            }, {});
            s.transactions.ids = transactions.map((t) => t.id);

            s.status = "initialized";
        });
        builder.addCase(fetchTransaction.fulfilled, (state, action) => {
            const transaction = action.payload;
            const groupId = transaction.group_id;
            const s = getGroupScopedState<TransactionState, TransactionSliceState>(state, groupId);
            addEntity(s.transactions, backendTransactionToTransaction(transaction));
            updateTransactionBalanceEffect(s.transactions, transaction.id);
        });
        builder.addCase(saveTransaction.fulfilled, (state, action) => {
            const { oldTransactionId, transaction } = action.payload;
            const groupId = transaction.group_id;
            const s = getGroupScopedState<TransactionState, TransactionSliceState>(state, groupId);
            addEntity(s.transactions, backendTransactionToTransaction(transaction));
            updateTransactionBalanceEffect(s.transactions, transaction.id);
            removeEntity(s.wipTransactions, oldTransactionId);
            delete s.wipTransactions.balanceEffects[oldTransactionId];
        });
        builder.addCase(createTransaction.fulfilled, (state, action) => {
            const { transaction } = action.payload;
            const { groupId } = action.meta.arg;
            const s = getGroupScopedState<TransactionState, TransactionSliceState>(state, groupId);
            addEntity(s.wipTransactions, { ...transaction, is_wip: true });
            updateTransactionBalanceEffect(s.wipTransactions, transaction.id);
        });
        builder.addCase(deleteTransaction.fulfilled, (state, action) => {
            const { transaction } = action.payload;
            const { groupId, transactionId } = action.meta.arg;
            const s = getGroupScopedState<TransactionState, TransactionSliceState>(state, groupId);
            // transaction is known by the server, i.e. id > 0
            if (transaction) {
                addEntity(s.transactions, backendTransactionToTransaction(transaction));
            }
            removeEntity(s.wipTransactions, transactionId);
            delete s.wipTransactions.balanceEffects[transactionId];
        });
        builder.addCase(leaveGroup.fulfilled, (state, action) => {
            const { groupId } = action.meta.arg;
            delete state.byGroupId[groupId];
        });
    },
});

// internal actions
const { advanceNextLocalTransactionId } = transactionSlice.actions;

export const {
    transactionEditStarted,
    wipTransactionUpdated,
    wipFileAdded,
    wipFileDeleted,
    wipFileUpdated,
    wipPositionUpdated,
    wipPositionAdded,
    positionDeleted,
    discardTransactionChange,
} = transactionSlice.actions;

export const { reducer: transactionReducer } = transactionSlice;
