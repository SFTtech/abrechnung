import React, {Suspense} from "react";
import {useRouteMatch} from "react-router-dom";
import {useRecoilValue} from "recoil";
import {commitRevision, discardRevision, startEditTransaction, transaction} from "../../recoil/transactions";
import Loading from "../../components/style/Loading";
import TransactionCreditorShares from "../../components/transactions/TransactionCreditorShares";
import TransactionShares from "../../components/transactions/TransactionDebitorShares";
import {sessionToken} from "../../recoil/auth";
import TransactionDetail from "../../components/transactions/TransactionDetail";
import {uncommitedTransactionRevision} from "../../recoil/revision";
import Button from "@material-ui/core/Button";
import Paper from "@material-ui/core/Paper";
import Chip from "@material-ui/core/Chip";
import {makeStyles} from "@material-ui/core";
import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";
import {toast} from "react-toastify";

const useStyles = makeStyles((theme) => ({
    paper: {
        padding: theme.spacing(2),
    },
}));

export default function Transaction({group}) {
    const classes = useStyles();
    const match = useRouteMatch();
    const transactionID = parseInt(match.params.id);
    const authtoken = useRecoilValue(sessionToken);
    const wipRevision = useRecoilValue(uncommitedTransactionRevision({
        groupID: group.group_id,
        transactionID: transactionID
    }));
    const isEditing = wipRevision !== null;

    const t = useRecoilValue(transaction({groupID: group.group_id, transactionID: transactionID}));
    // TODO: handle 404
    // TODO: wait for transaction to actually load in case we are redirected from create transaction
    // TODO: get latest revision of this transaction to determine if we are in edit mode or not
    // TODO: if we are enable editing
    // TODO: add edit button that opens a new revision
    // TODO: in edit mode add cancel button

    const edit = () => {
        startEditTransaction({sessionToken: authtoken, transactionID: transactionID})
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
            discardRevision({sessionToken: authtoken, revisionID: wipRevision.revision_id})
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
            commitRevision({sessionToken: authtoken, revisionID: wipRevision.revision_id})
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
                {isEditing ? (
                    <Grid container justify="space-between">
                        <Chip color="primary" label="WIP"/>
                        <div>
                            <Button color="primary" onClick={commitEdit}>Save</Button>
                            <Button color="secondary" onClick={abortEdit}>Cancel</Button>
                        </div>
                    </Grid>
                ) : (
                    <Grid container justify="flex-end">
                        <Button color="primary" onClick={edit}>Edit</Button>
                    </Grid>
                )}
            </div>
            <TransactionDetail group={group} transaction={t} wipRevision={wipRevision}/>

            <Typography variant="subtitle1">
                Paid for by
            </Typography>
            <Suspense fallback={<Loading/>}>
                <TransactionCreditorShares group={group} transaction={t}/>
            </Suspense>

            <Typography variant="subtitle1">
                Transaction Shares
            </Typography>
            <Suspense fallback={<Loading/>}>
                <TransactionShares group={group} transaction={t}/>
            </Suspense>
        </Paper>
    );
}

