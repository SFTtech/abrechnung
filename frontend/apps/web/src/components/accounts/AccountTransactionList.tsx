import React from "react";
import { List } from "@mui/material";
import AccountTransactionListEntry from "./AccountTransactionListEntry";
import { useRecoilValue } from "recoil";
import { accountTransactions } from "../../state/transactions";
import { clearingAccountsInvolvingUser } from "../../state/accounts";
import { Group, Account, Transaction } from "@abrechnung/types";
import AccountClearingListEntry from "./AccountClearingListEntry";

type ArrayAccountsAndTransactions = Array<Transaction | Account>;

interface Props {
    group: Group;
    accountID: number;
}

export const AccountTransactionList: React.FC<Props> = ({ group, accountID }) => {
    const transactions = useRecoilValue(accountTransactions({ groupID: group.id, accountID: accountID }));
    const clearingAccounts = useRecoilValue(clearingAccountsInvolvingUser({ groupID: group.id, accountID: accountID }));

    const combinedList: ArrayAccountsAndTransactions = (transactions as ArrayAccountsAndTransactions)
        .concat(clearingAccounts)
        .sort((f1, f2) => f2.lastChanged.getTime() - f1.lastChanged.getTime());

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
