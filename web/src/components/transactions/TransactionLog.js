import React from "react";
import {Link as RouterLink, useRouteMatch} from "react-router-dom";
import {useRecoilValue} from "recoil";
import {groupTransactions} from "../../recoil/transactions";
import List from "@material-ui/core/List";
import IconButton from "@material-ui/core/IconButton";
import Paper from "@material-ui/core/Paper";
import Add from "@material-ui/icons/Add";
import ListItemLink from "../style/ListItemLink";
import ListItemText from "@material-ui/core/ListItemText";
import Grid from "@material-ui/core/Grid";
import {makeStyles} from "@material-ui/core";

const useStyles = makeStyles((theme) => ({
    paper: {
        padding: theme.spacing(2),
    },
}));

export default function TransactionLog({group}) {
    const classes = useStyles();
    const {url} = useRouteMatch();
    const transactions = useRecoilValue(groupTransactions(group.group_id));
    // TODO

    return (
        <Paper elevation={1} className={classes.paper}>
            <List>
                {transactions.length === 0 ? (
                    <div className="list-group-item" key={0}>No Transactions</div>
                ) : (
                    transactions.map(transaction => (
                        <ListItemLink key={transaction.transaction_id}
                                      to={`/groups/${group.group_id}/transactions/${transaction.transaction_id}`}>
                            <ListItemText primary={transaction.description}
                                          secondary={`${transaction.value} ${transaction.currency_symbol} `}/>
                        </ListItemLink>
                    ))
                )}
            </List>
            <Grid container justify="center">
                <IconButton color="primary" component={RouterLink} to={`${url}/new`}>
                    <Add/>
                </IconButton>
            </Grid>
        </Paper>
    );
}
