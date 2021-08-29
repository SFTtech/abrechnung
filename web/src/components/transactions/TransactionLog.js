import React, {useState} from "react";
import {useRecoilValue} from "recoil";
import {transactionsSeenByUser} from "../../recoil/transactions";
import List from "@material-ui/core/List";
import IconButton from "@material-ui/core/IconButton";
import Add from "@material-ui/icons/Add";
import ListItemLink from "../style/ListItemLink";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";
import Grid from "@material-ui/core/Grid";
import Chip from "@material-ui/core/Chip";
import TransactionCreateModal from "./TransactionCreateModal";
import {makeStyles} from "@material-ui/core";

const useStyles = makeStyles((theme) => ({
    propertyPill: {
        marginRight: "3px"
    }
}));

export default function TransactionLog({group}) {
    const classes = useStyles();
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const transactions = useRecoilValue(transactionsSeenByUser(group.id));

    return (
        <div>
            <List>
                {transactions.length === 0 ? (
                    <div className="list-group-item" key={0}>No Transactions</div>
                ) : (
                    transactions.map(transaction => (
                        <ListItemLink key={transaction.id}
                                      to={`/groups/${group.id}/transactions/${transaction.id}`}>
                            <ListItemText primary={transaction.description}
                                          secondary={`${transaction.value.toFixed(2)} ${transaction.currency_symbol} `}/>
                            <ListItemSecondaryAction>
                                {transaction.is_wip && (
                                    <Chip color="secondary" variant="outlined" label="WIP"
                                          className={classes.propertyPill}/>
                                )}
                                <Chip color="primary" variant="outlined" label={transaction.type}/>
                            </ListItemSecondaryAction>
                        </ListItemLink>
                    ))
                )}
            </List>
            <Grid container justify="center">
                <IconButton color="primary" onClick={() => setShowCreateDialog(true)}>
                    <Add/>
                </IconButton>
            </Grid>

            <TransactionCreateModal group={group} show={showCreateDialog} onClose={() => setShowCreateDialog(false)}/>
        </div>
    );
}
