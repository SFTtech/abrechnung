import React, {Suspense, useEffect, useState} from "react";
import {useRouteMatch} from "react-router-dom";
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
import {makeStyles} from "@material-ui/core";
import Grid from "@material-ui/core/Grid";
import {toast} from "react-toastify";
import EditIcon from "@material-ui/icons/Edit";
import IconButton from "@material-ui/core/IconButton";
import {Alert} from "@material-ui/lab";
import {userData} from "../../recoil/auth";
import {commitTransaction, discardTransactionChange} from "../../api";

const useStyles = makeStyles((theme) => ({
    paper: {
        padding: theme.spacing(2),
    },
}));

export default function Transaction({group}) {
    const classes = useStyles();
    const match = useRouteMatch();
    const transactionID = match.params.id;
    const user = useRecoilValue(userData);

    const transaction = useRecoilValue(transactionById({groupID: group.id, transactionID: transactionID}));
    // TODO: handle 404

    const [isEditing, setEditing] = useState(false);

    useEffect(() => {
        setEditing(transaction.is_wip)
    }, [transaction, user])

    const edit = () => {
        setEditing(true);
    }

    const abortEdit = () => {
        if (isEditing) {
            discardTransactionChange({groupID: group.id, transactionID: transaction.id})
                .then(result => {
                })
                .catch(err => {
                    toast.error(`Error discarding transaction: ${err}!`);
                })
        }
    }

    const commitEdit = () => {
        if (isEditing) {
            commitTransaction({groupID: group.id, transactionID: transaction.id})
                .then(result => {
                })
                .catch(err => {
                    toast.error(`Error commiting transaction: ${err}!`);
                })
        }
    }

    return (
        <Paper elevation={1} className={classes.paper}>
            <div>
                <Grid container justify="space-between">
                    <Chip color="primary" label={transaction.type}/>
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

            <TransactionDetail group={group} transaction={transaction} isEditing={isEditing}/>

            <Suspense fallback={<Loading/>}>
                {transaction.type === "transfer" ? (
                    <TransferShares group={group} transaction={transaction} isEditing={isEditing}/>
                ) : transaction.type === "purchase" ? (
                    <PurchaseShares group={group} transaction={transaction} isEditing={isEditing}/>
                ) : transaction.type === "mimo" ? (
                    <MimoShares group={group} transaction={transaction} isEditing={isEditing}/>
                ) : (
                    <Alert severity="danger">Error: Invalid Transaction Type "{transaction.type}"</Alert>
                )}
            </Suspense>
        </Paper>
    );
}

