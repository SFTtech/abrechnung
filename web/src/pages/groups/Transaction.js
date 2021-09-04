import React, {Suspense, useState} from "react";
import {Link as RouterLink, useHistory, useRouteMatch} from "react-router-dom";
import {useRecoilValue} from "recoil";
import {transactionById} from "../../recoil/transactions";
import Loading from "../../components/style/Loading";
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
import {ChevronLeft} from "@material-ui/icons";
import TransferDetails from "../../components/transactions/TransferDetails";
import PurchaseDetails from "../../components/transactions/PurchaseDetails";

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
            if (transaction.has_committed_changes) {
                discardTransactionChange({groupID: group.id, transactionID: transaction.id})
                    .catch(err => {
                        toast.error(err);
                    });
            } else {
                history.push(`/groups/${group.id}/`);
            }
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
                        <div>
                            <IconButton component={RouterLink} to={`/groups/${group.id}/`}>
                                <ChevronLeft/>
                            </IconButton>
                            <Chip color="primary" label={transaction.type}/>
                        </div>
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

                <Suspense fallback={<Loading/>}>
                    {transaction.type === "transfer" ? (
                        <TransferDetails group={group} transaction={transaction}/>
                    ) : transaction.type === "purchase" ? (
                        <PurchaseDetails group={group} transaction={transaction}/>
                    ) : transaction.type === "mimo" ? (
                        <Alert severity="danger">Error: MIMO handling is not implemented yet</Alert>
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

