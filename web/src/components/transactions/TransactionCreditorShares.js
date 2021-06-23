import React from "react";
import {useRecoilValue} from "recoil";
import {transactionCreditorShares} from "../../recoil/transactions";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";


export default function TransactionCreditorShares({group, transaction}) {
    const shares = useRecoilValue(transactionCreditorShares(transaction.transaction_id));

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
