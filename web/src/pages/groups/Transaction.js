import React, {Suspense} from "react";
import {useRouteMatch} from "react-router-dom";
import {useRecoilValue} from "recoil";
import {commitRevision, discardRevision, startEditTransaction, transaction} from "../../recoil/transactions";
import Loading from "../../components/style/Loading";
import TransactionDetail from "../../components/transactions/TransactionDetail";
import TransferShares from "../../components/transactions/TransferShares";
import PurchaseShares from "../../components/transactions/PurchaseShares";
import MimoShares from "../../components/transactions/MimoShares";
import Button from "@material-ui/core/Button";
import Paper from "@material-ui/core/Paper";
import Chip from "@material-ui/core/Chip";
import {makeStyles} from "@material-ui/core";
import Grid from "@material-ui/core/Grid";
import {toast} from "react-toastify";
import EditIcon from "@material-ui/icons/Edit";
import IconButton from "@material-ui/core/IconButton";
import {Alert} from "@material-ui/lab";
import {uncommitedTransactionRevision} from "../../recoil/revisions";

const useStyles = makeStyles((theme) => ({
    paper: {
        padding: theme.spacing(2),
    },
}));

export default function Transaction({group}) {
    const classes = useStyles();
    const match = useRouteMatch();
    const transactionID = parseInt(match.params.id);
    const wipRevision = useRecoilValue(uncommitedTransactionRevision({
        groupID: group.group_id,
        transactionID: transactionID
    }));
    const isEditing = wipRevision !== null;

    const t = useRecoilValue(transaction({groupID: group.group_id, transactionID: transactionID}));
    // TODO: handle 404
    // TODO: wait for transaction to actually load in case we are redirected from create transaction

    const edit = () => {
        startEditTransaction({transactionID: transactionID})
            .then(result => {
            })
            .catch(err => {
                toast.error(`Error starting transaction edit: ${err}!`, {
                    position: "top-right",
                    autoClose: 5000,
                });
            })
    }

    const abortEdit = () => {
        if (wipRevision !== null) {
            discardRevision({revisionID: wipRevision.revision_id})
                .then(result => {
                })
                .catch(err => {
                    toast.error(`Error discarding transaction: ${err}!`, {
                        position: "top-right",
                        autoClose: 5000,
                    });
                })
        }
    }

    const commitEdit = () => {
        if (wipRevision !== null) {
            commitRevision({revisionID: wipRevision.revision_id})
                .then(result => {
                })
                .catch(err => {
                    toast.error(`Error commiting transaction: ${err}!`, {
                        position: "top-right",
                        autoClose: 5000,
                    });
                })
        }
    }

    return (
        <Paper elevation={1} className={classes.paper}>
            <div>
                <Grid container justify="space-between">
                    <Chip color="primary" label={t.type}/>
                    {isEditing ? (
                        <div>
                            <Button color="primary" onClick={commitEdit}>Save</Button>
                            <Button color="secondary" onClick={abortEdit}>Cancel</Button>
                        </div>
                    ) : (
                        <IconButton color="primary" onClick={edit}><EditIcon/></IconButton>
                    )}
                </Grid>
            </div>

            <TransactionDetail group={group} transaction={t} wipRevision={wipRevision}/>

            <Suspense fallback={<Loading/>}>
                {t.type === "transfer" ? (
                    <TransferShares group={group} transaction={t} wipRevision={wipRevision}/>
                ) : t.type === "purchase" ? (
                    <PurchaseShares group={group} transaction={t} wipRevision={wipRevision}/>
                ) : t.type === "mimo" ? (
                    <MimoShares group={group} transaction={t} wipRevision={wipRevision}/>
                ) : (
                    <Alert severity="danger">Error: Invalid Transaction Type "{t.type}"</Alert>
                )}
            </Suspense>
        </Paper>
    );
}

