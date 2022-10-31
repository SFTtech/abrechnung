import { Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton } from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { ChevronLeft, Delete, Edit } from "@mui/icons-material";
import React, { useState } from "react";
import { api } from "../../core/api";
import { toast } from "react-toastify";
import { useRecoilTransaction_UNSTABLE, useRecoilValue, useResetRecoilState, useSetRecoilState } from "recoil";
import { currUserPermissions } from "../../state/groups";
import {
    groupTransactionContainers,
    pendingTransactionDetailChanges,
    pendingTransactionPositionChanges,
    updateTransactionInState,
} from "../../state/transactions";
import { Transaction, TransactionContainer } from "@abrechnung/types";
import { HttpError } from "@abrechnung/api";

interface Props {
    groupID: number;
    transaction: Transaction;
}

export const TransactionActions: React.FC<Props> = ({ groupID, transaction }) => {
    const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);

    const navigate = useNavigate();
    const userPermissions = useRecoilValue(currUserPermissions(groupID));
    const setTransactions = useSetRecoilState(groupTransactionContainers(transaction.groupID));
    const localTransactionChanges = useRecoilValue(pendingTransactionDetailChanges(transaction.id));
    const localPositionChanges = useRecoilValue(pendingTransactionPositionChanges(transaction.id));
    const resetLocalTransactionChanges = useResetRecoilState(pendingTransactionDetailChanges(transaction.id));
    const resetLocalPositionChanges = useResetRecoilState(pendingTransactionPositionChanges(transaction.id));

    const updateTransactionAndClearLocal = useRecoilTransaction_UNSTABLE(
        ({ get, set, reset }) =>
            (transaction: TransactionContainer) => {
                console.log(transaction);
                set(groupTransactionContainers(transaction.transaction.groupID), (currTransactions) => {
                    return currTransactions.map((t) =>
                        t.transaction.id === transaction.transaction.id ? transaction : t
                    );
                });
                reset(pendingTransactionDetailChanges(transaction.transaction.id));
                reset(pendingTransactionPositionChanges(transaction.transaction.id));
            }
    );

    const edit = () => {
        if (!transaction.hasUnpublishedChanges) {
            api.createTransactionChange(transaction.id)
                .then((t) => {
                    updateTransactionAndClearLocal(t);
                })
                .catch((err: HttpError) => {
                    toast.error(err.message);
                });
        }
    };

    const abortEdit = () => {
        if (transaction.hasUnpublishedChanges) {
            if (transaction.hasCommittedChanges) {
                api.discardTransactionChange(transaction.id)
                    .then((t) => {
                        updateTransactionAndClearLocal(t);
                    })
                    .catch((err: HttpError) => {
                        toast.error(err.message);
                    });
            } else {
                navigate(`/groups/${groupID}/`);
            }
        }
    };

    const commitEdit = () => {
        if (!transaction.hasUnpublishedChanges) {
            return;
        }
        // update the transaction given the currently pending changes
        // find out which local changes we have and send them to da server
        const positions = Object.values(localPositionChanges.modified).concat(
            Object.values(localPositionChanges.added).map((position) => ({
                ...position,
                id: -1,
            }))
        );

        if (Object.keys(localTransactionChanges).length > 0) {
            const t = {
                transactionID: transaction.id,
                description: transaction.description,
                value: transaction.value,
                billedAt: transaction.billedAt,
                currencySymbol: transaction.currencySymbol,
                currencyConversionRate: transaction.currencyConversionRate,
                creditorShares: transaction.creditorShares,
                debitorShares: transaction.debitorShares,
                ...localTransactionChanges,
                positions: positions.length > 0 ? positions : null,
            };
            api.updateTransaction(
                t.transactionID,
                t.description,
                t.value,
                t.billedAt,
                t.currencySymbol,
                t.currencyConversionRate,
                t.creditorShares,
                t.debitorShares,
                t.positions
            )
                .then((t) => {
                    updateTransactionAndClearLocal(t);
                })
                .catch((err: HttpError) => {
                    toast.error(err.message);
                });
        } else if (positions.length > 0) {
            api.updateTransactionPositions(transaction.id, positions)
                .then((t) => {
                    updateTransactionAndClearLocal(t);
                })
                .catch((err: HttpError) => {
                    toast.error(err.message);
                });
        } else {
            api.commitTransaction(transaction.id)
                .then((t) => {
                    updateTransactionAndClearLocal(t);
                })
                .catch((err: HttpError) => {
                    toast.error(err.message);
                });
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
            .catch((err: HttpError) => {
                toast.error(err.message);
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
                            {transaction.hasUnpublishedChanges ? (
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
                    Are you sure you want to delete the transaction &quot{transaction.description}&quot
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
