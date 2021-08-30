import { useRecoilValue } from "recoil";
import { groupAccounts } from "../../recoil/groups";
import { accountBalances } from "../../recoil/transactions";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import React from "react";


export default function Balances({ group }) {
    const accounts = useRecoilValue(groupAccounts(group.id));
    const balances = useRecoilValue(accountBalances(group.id));
    return (
        <List>
            {accounts.length === 0 ? (
                <ListItem key={0}>
                    <ListItemText primary="No Accounts" />
                </ListItem>
            ) : (
                accounts.map(account => (
                    <ListItem key={account.id}>
                        <ListItemText primary={account.name} />
                        <ListItemText primary={`${balances[account.id].toFixed(2)} ${group.currency_symbol}`} />
                    </ListItem>
                ))
            )}
        </List>
    );
}