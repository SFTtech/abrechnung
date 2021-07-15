import React, {useState} from "react";
import {Link as RouterLink} from "react-router-dom";
import {useRecoilValue} from "recoil";
import {groupTransactions} from "../../recoil/transactions";
import List from "@material-ui/core/List";
import IconButton from "@material-ui/core/IconButton";
import Add from "@material-ui/icons/Add";
import ListItemLink from "../style/ListItemLink";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";
import Grid from "@material-ui/core/Grid";
import Chip from "@material-ui/core/Chip";
import TransactionCreateModal from "../groups/TransactionCreateModal";


export default function TransactionLog({group}) {
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const transactions = useRecoilValue(groupTransactions(group.group_id));
    // TODO

    return (
        <div>
            <List>
                {transactions.length === 0 ? (
                    <div className="list-group-item" key={0}>No Transactions</div>
                ) : (
                    transactions.map(transaction => (
                        <ListItemLink key={transaction.transaction_id}
                                      to={`/groups/${group.group_id}/transactions/${transaction.transaction_id}`}>
                            <ListItemText primary={transaction.description}
                                          secondary={`${transaction.value} ${transaction.currency_symbol} `}/>
                            <ListItemSecondaryAction>
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
