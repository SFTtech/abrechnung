import React, {Suspense, useState} from "react";
import {Link as RouterLink, useHistory, useRouteMatch} from "react-router-dom";
import {useRecoilValue} from "recoil";
import {transactionById} from "../../recoil/transactions";
import Loading from "../../components/style/Loading";
import {toast} from "react-toastify";
import {Alert} from "@mui/lab";
import {commitTransaction, createTransactionChange, deleteTransaction, discardTransactionChange} from "../../api";
import {currUserPermissions} from "../../recoil/groups";
import { ChevronLeft, Delete, Edit } from "@mui/icons-material";
import TransferDetails from "../../components/transactions/TransferDetails";
import PurchaseDetails from "../../components/transactions/PurchaseDetails";
import {
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    Paper, Typography
} from "@mui/material";
import { makeStyles } from "@mui/styles";
import PurchaseItems from "../../components/transactions/purchase/PurchaseItems";
import clsx from "clsx";

const useStyles = makeStyles((theme) => ({
    paper: {
        padding: theme.spacing(2)
    },
    spacerTop: {
        marginTop: theme.spacing(3)
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
                    <Grid container justifyContent="space-between">
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
                                        <IconButton color="primary" onClick={edit}><Edit/></IconButton>
                                    )}
                                    <IconButton
                                        color="secondary"
                                        onClick={() => setConfirmDeleteDialogOpen(true)}
                                    >
                                        <Delete/>
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
            {transaction.type === "purchase" && (transaction.is_wip || transaction.purchase_items != null && transaction.purchase_items.length > 0) && (
                <Paper elevation={1} className={clsx(classes.paper, classes.spacerTop)}>
                    <Typography>Positions</Typography>
                    <PurchaseItems group={group} transaction={transaction} />
                </Paper>
            )}
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

