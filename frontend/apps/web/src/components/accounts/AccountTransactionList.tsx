import { selectClearingAccountsInvolvingAccounts, selectTransactionsInvolvingAccount } from "@abrechnung/redux";
import { Account, Transaction } from "@abrechnung/types";
import { Alert, List } from "@mui/material";
import { DateTime } from "luxon";
import React from "react";
import { selectAccountSlice, selectTransactionSlice, useAppSelector } from "@/store";
import AccountClearingListEntry from "./AccountClearingListEntry";
import AccountTransactionListEntry from "./AccountTransactionListEntry";

type ArrayAccountsAndTransactions = Array<Transaction | Account>;

interface Props {
    groupId: number;
    accountId: number;
}

export const AccountTransactionList: React.FC<Props> = ({ groupId, accountId }) => {
    const transactions = useAppSelector((state) =>
        selectTransactionsInvolvingAccount({ state: selectTransactionSlice(state), groupId, accountId })
    );
    const clearingAccounts = useAppSelector((state) =>
        selectClearingAccountsInvolvingAccounts({ state: selectAccountSlice(state), groupId, accountId })
    );

    const combinedList: ArrayAccountsAndTransactions = (transactions as ArrayAccountsAndTransactions)
        .concat(clearingAccounts)
        .sort((f1, f2) => DateTime.fromISO(f2.last_changed).toMillis() - DateTime.fromISO(f1.last_changed).toMillis());

    return (
        <List>
            {combinedList.length === 0 && <Alert severity="info">None so far.</Alert>}
            {combinedList.map((entry) => {
                if (entry.type === "clearing") {
                    return (
                        <AccountClearingListEntry
                            key={`clearing-${entry.id}`}
                            accountId={accountId}
                            groupId={groupId}
                            clearingAccountId={entry.id}
                        />
                    );
                }
                if (entry.type === "personal") {
                    return null;
                }

                // we need to case "entry" to Transaction as typescript cant deduce that it
                // has to be a transaction even though we handled all other "type" cases before
                return (
                    <AccountTransactionListEntry
                        key={`transaction-${entry.id}`}
                        accountId={accountId}
                        groupId={groupId}
                        transactionId={entry.id}
                    />
                );
            })}
        </List>
    );
};

export default AccountTransactionList;
