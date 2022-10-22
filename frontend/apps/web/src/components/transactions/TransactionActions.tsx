import { Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton } from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { ChevronLeft, Delete, Edit } from "@mui/icons-material";
import React, { useState } from "react";
import { api } from "../../core/api";
import { toast } from "react-toastify";
import { useRecoilTransaction_UNSTABLE, useRecoilValue, useResetRecoilState, useSetRecoilState } from "recoil";
import { currUserPermissions } from "../../state/groups";
import {
    groupTransactions,
    pendingTransactionDetailChanges,
    pendingTransactionPositionChanges,
    updateTransactionInState,
} from "../../state/transactions";
import { Transaction } from "@abrechnung/types";

interface Props {
    groupID: number;
    transaction: Transaction;
}

export const TransactionActions: React.FC<Props> = ({ groupID, transaction }) => {
    const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);

    const navigate = useNavigate();
    const userPermissions = useRecoilValue(currUserPermissions(groupID));
    const setTransactions = useSetRecoilState(groupTransactions(transaction.groupID));
    const localTransactionChanges = useRecoilValue(pendingTransactionDetailChanges(transaction.id));
    const localPositionChanges = useRecoilValue(pendingTransactionPositionChanges(transaction.id));
    const resetLocalTransactionChanges = useResetRecoilState(pendingTransactionDetailChanges(transaction.id));
    const resetLocalPositionChanges = useResetRecoilState(pendingTransactionPositionChanges(transaction.id));

    const updateTransactionAndClearLocal = useRecoilTransaction_UNSTABLE(
        ({ get, set, reset }) =>
            (transaction: Transaction) => {
                set(groupTransactions(transaction.groupID), (currTransactions) => {
                    return currTransactions.map((t) => (t.id === transaction.id ? transaction : t));
                });
                reset(pendingTransactionDetailChanges(transaction.id));
                reset(pendingTransactionPositionChanges(transaction.id));
            }
    );

    const edit = () => {
        if (!transaction.isWip) {
            api.createTransactionChange(transaction.id)
                .then((t) => {
                    updateTransactionAndClearLocal(t);
                })
                .catch((err) => {
                    toast.error(err);
                });
        }
    };

    const abortEdit = () => {
        if (transaction.isWip) {
            if (transaction.hasCommittedChanges) {
                api.discardTransactionChange(transaction.id)
                    .then((t) => {
                        updateTransactionAndClearLocal(t);
                    })
                    .catch((err) => {
                        toast.error(err);
                    });
            } else {
                navigate(`/groups/${groupID}/`);
            }
        }
    };

    const commitEdit = () => {
        if (transaction.isWip) {
            // update the transaction given the currently pending changes
            // find out which local changes we have and send them to da server
            const positions = Object.values(localPositionChanges.modified).concat(
                Object.values(localPositionChanges.added).map((position) => ({
                    ...position,
                    id: -1,
                }))
            );

            if (Object.keys(localTransactionChanges).length > 0) {
                const transactionDetails = {
                    transactionID: transaction.id,
                    description: transaction.details.description,
                    value: transaction.details.value,
                    billedAt: transaction.details.billedAt,
                    currencySymbol: transaction.details.currencySymbol,
                    currencyConversionRate: transaction.details.currencyConversionRate,
                    creditorShares: transaction.details.creditorShares,
                    debitorShares: transaction.details.debitorShares,
                    ...localTransactionChanges,
                    positions: positions.length > 0 ? positions : null,
                };
                api.updateTransaction(
                    transactionDetails.transactionID,
                    transactionDetails.description,
                    transactionDetails.value,
                    transactionDetails.billedAt,
                    transactionDetails.currencySymbol,
                    transactionDetails.currencyConversionRate,
                    transactionDetails.creditorShares,
                    transactionDetails.debitorShares,
                    transactionDetails.positions
                )
                    .then((t) => {
                        updateTransactionAndClearLocal(t);
                    })
                    .catch((err) => {
                        toast.error(err);
                    });
            } else if (positions.length > 0) {
                api.updateTransactionPositions(transaction.id, positions)
                    .then((t) => {
                        updateTransactionAndClearLocal(t);
                    })
                    .catch((err) => {
                        toast.error(err);
                    });
            } else {
                api.commitTransaction(transaction.id)
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
        api.deleteTransaction(transaction.id)
            .then((t) => {
                // TODO: use recoil transaction
                updateTransactionInState(t, setTransactions);
                resetLocalPositionChanges();
                resetLocalTransactionChanges();
                navigate(`/groups/${groupID}/`);
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
                    {userPermissions.canWrite && (
                        <>
                            {transaction.isWip ? (
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
                    Are you sure you want to delete the transaction &quot{transaction.details.description}&quot
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
};

export default TransactionActions;
