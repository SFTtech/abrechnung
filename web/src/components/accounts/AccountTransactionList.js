import { List } from "@mui/material";
import AccountTransactionListEntry from "./AccountTransactionListEntry";
import { useRecoilValue } from "recoil";
import { accountTransactions } from "../../recoil/transactions";
import { clearingAccountsInvolvingUser } from "../../recoil/accounts";
import AccountClearingListEntry from "./AccountClearingListEntry";
import { DateTime } from "luxon";

export default function AccountTransactionList({ group, accountID }) {
    const transactions = useRecoilValue(accountTransactions({ groupID: group.id, accountID: accountID }));
    const clearingAccounts = useRecoilValue(clearingAccountsInvolvingUser({ groupID: group.id, accountID: accountID }));

    const combinedList = transactions
        .concat(clearingAccounts)
        .sort(
            (f1, f2) => DateTime.fromISO(f2.last_changed).toSeconds() - DateTime.fromISO(f1.last_changed).toSeconds()
        );

    return (
        <List>
            {combinedList.map((entry) => {
                if (entry.type === "clearing") {
                    return (
                        <AccountClearingListEntry key={entry.id} accountID={accountID} group={group} account={entry} />
                    );
                }

                return (
                    <AccountTransactionListEntry
                        key={entry.id}
                        accountID={accountID}
                        group={group}
                        transaction={entry}
                    />
                );
            })}
        </List>
    );
}
