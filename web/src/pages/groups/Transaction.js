import React, { Suspense, useEffect, useState } from "react";
import { useHistory, useRouteMatch } from "react-router-dom";
import { useRecoilValue } from "recoil";
import { transactionById } from "../../recoil/transactions";
import Loading from "../../components/style/Loading";
import TransactionDetail from "../../components/transactions/TransactionDetail";
import TransferShares from "../../components/transactions/TransferShares";
import PurchaseShares from "../../components/transactions/PurchaseShares";
import MimoShares from "../../components/transactions/MimoShares";
import Button from "@material-ui/core/Button";
import Paper from "@material-ui/core/Paper";
import Chip from "@material-ui/core/Chip";
import { Dialog, DialogActions, DialogContent, DialogTitle, makeStyles, Menu, MenuItem } from "@material-ui/core";
import Grid from "@material-ui/core/Grid";
import { toast } from "react-toastify";
import EditIcon from "@material-ui/icons/Edit";
import MoreVertIcon from "@material-ui/icons/MoreVert";
import IconButton from "@material-ui/core/IconButton";
import { Alert } from "@material-ui/lab";
import { userData } from "../../recoil/auth";
import {commitTransaction, createTransactionChange, deleteTransaction, discardTransactionChange} from "../../api";

const useStyles = makeStyles((theme) => ({
    paper: {
        padding: theme.spacing(2)
    }
}));

export default function Transaction({ group }) {
    const classes = useStyles();
    const [actionsAnchorEl, setAcionsAnchorEl] = useState(null);
    const moreActionsMenuOpen = Boolean(actionsAnchorEl);
    const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);

    const history = useHistory();
    const match = useRouteMatch();
    const transactionID = parseInt(match.params.id);

    const transaction = useRecoilValue(transactionById({ groupID: group.id, transactionID: transactionID }));
    // TODO: handle 404

    const openMoreActionsMenu = (event) => {
        setAcionsAnchorEl(event.currentTarget);
    };

    const closeMoreActionsMenu = () => {
        setAcionsAnchorEl(null);
    };

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
                .catch(err => {
                    toast.error(err);
                });
        }
    };

    const commitEdit = () => {
        if (transaction.is_wip) {
            commitTransaction({ groupID: group.id, transactionID: transaction.id })
                .catch(err => {
                    toast.error(err);
                });
        }
    };

    const confirmDeleteTransaction = () => {
        deleteTransaction({ groupID: group.id, transactionID: transaction.id })
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
                        <Chip color="primary" label={transaction.type} />
                        <div>
                            {transaction.is_wip ? (
                                <>
                                    <Button color="primary" onClick={commitEdit}>Save</Button>
                                    <Button color="secondary" onClick={abortEdit}>Cancel</Button>
                                </>
                            ) : (
                                <IconButton color="primary" onClick={edit}><EditIcon /></IconButton>
                            )}
                            <IconButton
                                aria-label="more"
                                aria-controls="long-menu"
                                aria-haspopup="true"
                                onClick={openMoreActionsMenu}
                            >
                                <MoreVertIcon />
                            </IconButton>
                            <Menu
                                id="long-menu"
                                anchorEl={actionsAnchorEl}
                                keepMounted
                                open={moreActionsMenuOpen}
                                onClose={closeMoreActionsMenu}
                            >
                                <MenuItem key="delete" onClick={() => setConfirmDeleteDialogOpen(true)}>
                                    delete
                                </MenuItem>
                            </Menu>
                        </div>
                    </Grid>
                </div>

                <TransactionDetail group={group} transaction={transaction} isEditing={transaction.is_wip} />

                <Suspense fallback={<Loading />}>
                    {transaction.type === "transfer" ? (
                        <TransferShares group={group} transaction={transaction} isEditing={transaction.is_wip} />
                    ) : transaction.type === "purchase" ? (
                        <PurchaseShares group={group} transaction={transaction} isEditing={transaction.is_wip} />
                    ) : transaction.type === "mimo" ? (
                        <MimoShares group={group} transaction={transaction} isEditing={transaction.is_wip} />
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

