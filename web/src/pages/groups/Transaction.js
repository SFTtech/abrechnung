import React, {Suspense, useState} from "react";
import {useHistory, useRouteMatch} from "react-router-dom";
import {useRecoilValue} from "recoil";
import {transactionById} from "../../recoil/transactions";
import Loading from "../../components/style/Loading";
import TransactionDetail from "../../components/transactions/TransactionDetail";
import TransferShares from "../../components/transactions/TransferShares";
import PurchaseShares from "../../components/transactions/PurchaseShares";
import MimoShares from "../../components/transactions/MimoShares";
import Button from "@material-ui/core/Button";
import Paper from "@material-ui/core/Paper";
import Chip from "@material-ui/core/Chip";
import {Dialog, DialogActions, DialogContent, DialogTitle, makeStyles} from "@material-ui/core";
import Grid from "@material-ui/core/Grid";
import {toast} from "react-toastify";
import EditIcon from "@material-ui/icons/Edit";
import IconButton from "@material-ui/core/IconButton";
import DeleteButton from "@material-ui/icons/Delete";
import {Alert} from "@material-ui/lab";
import {commitTransaction, createTransactionChange, deleteTransaction, discardTransactionChange} from "../../api";
import {currUserPermissions} from "../../recoil/groups";

const useStyles = makeStyles((theme) => ({
    paper: {
        padding: theme.spacing(2)
    }
}));

export default function Transaction({group}) {
    const classes = useStyles();
    const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);

    const history = useHistory();
    const match = useRouteMatch();
    const transactionID = parseInt(match.params.id);

    const transaction = useRecoilValue(transactionById({groupID: group.id, transactionID: transactionID}));
    const userPermissions = useRecoilValue(currUserPermissions(group.id));

    // TODO: handle 404

    const edit = () => {
        if (!transaction.is_wip) {
            createTransactionChange({groupID: group.id, transactionID: transaction.id})
                .catch(err => {
                    toast.error(err);
                });
        }
    };

    const abortEdit = () => {
        if (transaction.is_wip) {
            discardTransactionChange({groupID: group.id, transactionID: transaction.id})
                .then(res => {
                    if (!transaction.has_committed_changes) {
                        history.push(`/groups/${group.id}/`);
                    }
                })
                .catch(err => {
                    toast.error(err);
                });
        }
    };

    const commitEdit = () => {
        if (transaction.is_wip) {
            commitTransaction({groupID: group.id, transactionID: transaction.id})
                .catch(err => {
                    toast.error(err);
                });
        }
    };

    const confirmDeleteTransaction = () => {
        deleteTransaction({groupID: group.id, transactionID: transaction.id})
            .then(res => {
                history.push(`/groups/${group.id}/`);
            })
            .catch(err => {
                toast.error(err);
            });
    };

    return (
        <>
            <Paper elevation={1} className={classes.paper}>
                <div>
                    <Grid container justify="space-between">
                        <Chip color="primary" label={transaction.type}/>
                        <div>
                            {userPermissions.can_write && (
                                <>
                                    {transaction.is_wip ? (
                                        <>
                                            <Button color="primary" onClick={commitEdit}>Save</Button>
                                            <Button color="secondary" onClick={abortEdit}>Cancel</Button>
                                        </>
                                    ) : (
                                        <IconButton color="primary" onClick={edit}><EditIcon/></IconButton>
                                    )}
                                    <IconButton
                                        color="secondary"
                                        onClick={() => setConfirmDeleteDialogOpen(true)}
                                    >
                                        <DeleteButton/>
                                    </IconButton>
                                </>
                            )}
                        </div>
                    </Grid>
                </div>

                <TransactionDetail group={group} transaction={transaction} isEditing={transaction.is_wip}/>

                <Suspense fallback={<Loading/>}>
                    {transaction.type === "transfer" ? (
                        <TransferShares group={group} transaction={transaction} isEditing={transaction.is_wip}/>
                    ) : transaction.type === "purchase" ? (
                        <PurchaseShares group={group} transaction={transaction} isEditing={transaction.is_wip}/>
                    ) : transaction.type === "mimo" ? (
                        <MimoShares group={group} transaction={transaction} isEditing={transaction.is_wip}/>
                    ) : (
                        <Alert severity="danger">Error: Invalid Transaction Type "{transaction.type}"</Alert>
                    )}
                </Suspense>
            </Paper>
            <Dialog
                maxWidth="xs"
                aria-labelledby="confirmation-dialog-title"
                open={confirmDeleteDialogOpen}
            >
                <DialogTitle id="confirmation-dialog-title">Confirm delete transaction</DialogTitle>
                <DialogContent dividers>
                    Are you sure you want to delete the transaction "{transaction.description}"
                </DialogContent>
                <DialogActions>
                    <Button autoFocus onClick={() => setConfirmDeleteDialogOpen(false)} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={confirmDeleteTransaction} color="secondary">
                        Ok
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

