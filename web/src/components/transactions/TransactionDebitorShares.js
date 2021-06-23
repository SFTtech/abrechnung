import React from "react";
import {useRecoilValue} from "recoil";
import {transactionDebitorShares} from "../../recoil/transactions";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";


export default function TransactionDebitorShares({group, transaction}) {
    const shares = useRecoilValue(transactionDebitorShares(transaction.transaction_id));

    return (
        <List>
            {shares.map(share => {
                return (
                    <ListItem>
                        <ListItemText primary={`${share.account_id} - ${share.shares}`}/>
                    </ListItem>
                )
            })}
        </List>
    );
}
