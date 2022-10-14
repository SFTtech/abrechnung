import React from "react";
import { List } from "@mui/material";
import AccountTransactionListEntry from "./AccountTransactionListEntry";
import { useRecoilValue } from "recoil";
import { accountTransactions, Transaction } from "../../state/transactions";
import { AccountConsolidated, clearingAccountsInvolvingUser } from "../../state/accounts";
import AccountClearingListEntry from "./AccountClearingListEntry";
import { Group } from "../../state/groups";

type ArrayAccountsAndTransactions = Array<Transaction | AccountConsolidated>;

interface Props {
    group: Group;
    accountID: number;
}

export const AccountTransactionList: React.FC<Props> = ({ group, accountID }) => {
    const transactions = useRecoilValue(accountTransactions({ groupID: group.id, accountID: accountID }));
    const clearingAccounts = useRecoilValue(clearingAccountsInvolvingUser({ groupID: group.id, accountID: accountID }));

    const combinedList: ArrayAccountsAndTransactions = (transactions as ArrayAccountsAndTransactions)
        .concat(clearingAccounts)
        .sort((f1, f2) => f2.last_changed.toSeconds() - f1.last_changed.toSeconds());

    return (
        <List>
            {combinedList.map((entry) => {
                if (entry.type === "clearing") {
                    return (
                        <AccountClearingListEntry key={entry.id} accountID={accountID} group={group} account={entry} />
                    );
                }
                if (entry.type === "personal") {
                    return null;
                }

                // we need to case "entry" to Transaction as typescript cant deduce that it
                // has to be a transaction as we handled all other "type" cases before
                return (
                    <AccountTransactionListEntry
                        key={entry.id}
                        accountID={accountID}
                        group={group}
                        transaction={entry as Transaction}
                    />
                );
            })}
        </List>
    );
};

export default AccountTransactionList;
