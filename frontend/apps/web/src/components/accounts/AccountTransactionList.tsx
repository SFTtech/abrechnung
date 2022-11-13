import React from "react";
import { DateTime } from "luxon";
import { List } from "@mui/material";
import AccountTransactionListEntry from "./AccountTransactionListEntry";
import { Account, Transaction } from "@abrechnung/types";
import AccountClearingListEntry from "./AccountClearingListEntry";
import { selectAccountSlice, selectTransactionSlice, useAppSelector } from "../../store";
import { selectGroupAccountsFiltered, selectTransactionsInvolvingAccount } from "@abrechnung/redux";

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
        selectGroupAccountsFiltered({ state: selectAccountSlice(state), groupId, type: "clearing" })
    );

    const combinedList: ArrayAccountsAndTransactions = (transactions as ArrayAccountsAndTransactions)
        .concat(clearingAccounts)
        .sort((f1, f2) => DateTime.fromISO(f2.lastChanged).toMillis() - DateTime.fromISO(f1.lastChanged).toMillis());

    return (
        <List>
            {combinedList.map((entry) => {
                if (entry.type === "clearing") {
                    return (
                        <AccountClearingListEntry
                            key={entry.id}
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
                        key={entry.id}
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
