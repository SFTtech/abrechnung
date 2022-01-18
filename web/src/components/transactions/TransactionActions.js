import { Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton } from "@mui/material";
import { Link as RouterLink, useHistory } from "react-router-dom";
import { ChevronLeft, Delete, Edit } from "@mui/icons-material";
import React, { useState } from "react";
import { commitTransaction, createTransactionChange, deleteTransaction, discardTransactionChange } from "../../api";
import { toast } from "react-toastify";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { currUserPermissions } from "../../recoil/groups";
import { groupTransactions, updateTransaction } from "../../recoil/transactions";

export default function TransactionActions({ group, transaction }) {
    const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);

    const history = useHistory();
    const userPermissions = useRecoilValue(currUserPermissions(group.id));
    const setTransactions = useSetRecoilState(groupTransactions(transaction.group_id));

    const edit = () => {
        if (!transaction.is_wip) {
            createTransactionChange({
                groupID: group.id,
                transactionID: transaction.id,
            })
                .then((t) => {
                    updateTransaction(t, setTransactions);
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
                    groupID: group.id,
                    transactionID: transaction.id,
                })
                    .then((t) => {
                        updateTransaction(t, setTransactions);
                    })
                    .catch((err) => {
                        toast.error(err);
                    });
            } else {
                history.push(`/groups/${group.id}/`);
            }
        }
    };

    const commitEdit = () => {
        if (transaction.is_wip) {
            commitTransaction({
                groupID: group.id,
                transactionID: transaction.id,
            })
                .then((t) => {
                    updateTransaction(t, setTransactions);
                })
                .catch((err) => {
                    toast.error(err);
                });
        }
    };

    const confirmDeleteTransaction = () => {
        deleteTransaction({ groupID: group.id, transactionID: transaction.id })
            .then((t) => {
                updateTransaction(t, setTransactions);
                history.push(`/groups/${group.id}/`);
            })
            .catch((err) => {
                toast.error(err);
            });
    };

    return (
        <>
            <Grid container justifyContent="space-between">
                <div>
                    <IconButton component={RouterLink} to={`/groups/${group.id}/`}>
                        <ChevronLeft />
                    </IconButton>
                    <Chip color="primary" label={transaction.type} />
                </div>
                <div>
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
                </div>
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
