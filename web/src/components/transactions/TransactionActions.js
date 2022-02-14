import { Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton } from "@mui/material";
import { Link as RouterLink, useHistory } from "react-router-dom";
import { ChevronLeft, Delete, Edit } from "@mui/icons-material";
import React, { useState } from "react";
import {
    commitTransaction,
    createTransactionChange,
    deleteTransaction,
    discardTransactionChange,
    updateTransaction,
    updateTransactionPositions,
} from "../../api";
import { toast } from "react-toastify";
import { useRecoilTransaction_UNSTABLE, useRecoilValue, useResetRecoilState, useSetRecoilState } from "recoil";
import { currUserPermissions } from "../../recoil/groups";
import {
    groupTransactions,
    pendingTransactionDetailChanges,
    pendingTransactionPositionChanges,
    updateTransactionInState,
} from "../../recoil/transactions";

export default function TransactionActions({ groupID, transaction }) {
    const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);

    const history = useHistory();
    const userPermissions = useRecoilValue(currUserPermissions(groupID));
    const setTransactions = useSetRecoilState(groupTransactions(transaction.group_id));
    const localTransactionChanges = useRecoilValue(pendingTransactionDetailChanges(transaction.id));
    const localPositionChanges = useRecoilValue(pendingTransactionPositionChanges(transaction.id));
    const resetLocalTransactionChanges = useResetRecoilState(pendingTransactionDetailChanges(transaction.id));
    const resetLocalPositionChanges = useResetRecoilState(pendingTransactionPositionChanges(transaction.id));

    const updateTransactionAndClearLocal = useRecoilTransaction_UNSTABLE(({ get, set, reset }) => (transaction) => {
        set(groupTransactions(transaction.group_id), (currTransactions) => {
            return currTransactions.map((t) => (t.id === transaction.id ? transaction : t));
        });
        reset(pendingTransactionDetailChanges(transaction.id));
        reset(pendingTransactionPositionChanges(transaction.id));
    });

    const edit = () => {
        if (!transaction.is_wip) {
            createTransactionChange({
                groupID: groupID,
                transactionID: transaction.id,
            })
                .then((t) => {
                    updateTransactionAndClearLocal(t);
                })
                .catch((err) => {
                    toast.error(err);
                });
        }
    };

    const abortEdit = () => {
        if (transaction.is_wip) {
            if (transaction.has_committed_changes) {
                discardTransactionChange({
                    groupID: groupID,
                    transactionID: transaction.id,
                })
                    .then((t) => {
                        updateTransactionAndClearLocal(t);
                    })
                    .catch((err) => {
                        toast.error(err);
                    });
            } else {
                history.push(`/groups/${groupID}/`);
            }
        }
    };

    const commitEdit = () => {
        if (transaction.is_wip) {
            // update the transaction given the currently pending changes
            // find out which local changes we have and send them to da server
            const positions = Object.values(localPositionChanges.modified)
                .concat(
                    Object.values(localPositionChanges.added).map((position) => ({
                        ...position,
                        id: -1,
                    }))
                )
                .map((p) => ({
                    id: p.id,
                    name: p.name,
                    communist_shares: p.communist_shares,
                    price: p.price,
                    usages: p.usages,
                    deleted: p.deleted,
                }));

            if (Object.keys(localTransactionChanges).length > 0) {
                updateTransaction({
                    transactionID: transaction.id,
                    description: transaction.description,
                    value: transaction.value,
                    billedAt: transaction.billed_at,
                    currencySymbol: transaction.currency_symbol,
                    currencyConversionRate: transaction.currency_conversion_rate,
                    creditorShares: transaction.creditor_shares,
                    debitorShares: transaction.debitor_shares,
                    ...localTransactionChanges,
                    positions: positions.length > 0 ? positions : null,
                })
                    .then((t) => {
                        updateTransactionAndClearLocal(t);
                    })
                    .catch((err) => {
                        toast.error(err);
                    });
            } else if (positions.length > 0) {
                updateTransactionPositions({
                    transactionID: transaction.id,
                    positions: positions,
                })
                    .then((t) => {
                        updateTransactionAndClearLocal(t);
                    })
                    .catch((err) => {
                        toast.error(err);
                    });
            } else {
                commitTransaction({ transactionID: transaction.id })
                    .then((t) => {
                        updateTransactionAndClearLocal(t);
                    })
                    .catch((err) => {
                        toast.error(err);
                    });
            }
        }
    };

    const confirmDeleteTransaction = () => {
        deleteTransaction({ groupID: groupID, transactionID: transaction.id })
            .then((t) => {
                // TODO: use recoil transaction
                updateTransactionInState(t, setTransactions);
                resetLocalPositionChanges();
                resetLocalTransactionChanges();
                history.push(`/groups/${groupID}/`);
            })
            .catch((err) => {
                toast.error(err);
            });
    };

    return (
        <>
            <Grid container justifyContent="space-between">
                <Grid item sx={{ display: "flex", alignItems: "center" }}>
                    <IconButton
                        sx={{ display: { xs: "none", md: "inline-flex" } }}
                        component={RouterLink}
                        to={`/groups/${groupID}/`}
                    >
                        <ChevronLeft />
                    </IconButton>
                    <Chip color="primary" label={transaction.type} />
                </Grid>
                <Grid item>
                    {userPermissions.can_write && (
                        <>
                            {transaction.is_wip ? (
                                <>
                                    <Button color="primary" onClick={commitEdit}>
                                        Save
                                    </Button>
                                    <Button color="error" onClick={abortEdit}>
                                        Cancel
                                    </Button>
                                </>
                            ) : (
                                <IconButton color="primary" onClick={edit}>
                                    <Edit />
                                </IconButton>
                            )}
                            <IconButton color="error" onClick={() => setConfirmDeleteDialogOpen(true)}>
                                <Delete />
                            </IconButton>
                        </>
                    )}
                </Grid>
            </Grid>
            <Dialog maxWidth="xs" aria-labelledby="confirmation-dialog-title" open={confirmDeleteDialogOpen}>
                <DialogTitle id="confirmation-dialog-title">Confirm delete transaction</DialogTitle>
                <DialogContent dividers>
                    Are you sure you want to delete the transaction "{transaction.description}"
                </DialogContent>
                <DialogActions>
                    <Button autoFocus onClick={() => setConfirmDeleteDialogOpen(false)} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={confirmDeleteTransaction} color="error">
                        Ok
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
