import React from "react";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { accountsSeenByUser } from "../../state/accounts";
import AccountSelect from "../style/AccountSelect";
import { pendingTransactionDetailChanges } from "../../state/transactions";

export default function TransactionCreditorShare({ group, transaction, isEditing, ...props }) {
    const accounts = useRecoilValue(accountsSeenByUser(group.id));
    const shareAccountID =
        Object.keys(transaction.creditor_shares).length === 0 ? null : Object.keys(transaction.creditor_shares)[0];
    const setLocalTransactionDetails = useSetRecoilState(pendingTransactionDetailChanges(transaction.id));

    const getAccount = (accountID) => {
        return accounts.find((account) => account.id === accountID);
    };

    const onCreditorChange = (account) => {
        if (account === null) {
            return; // TODO: some error handling
        }
        if (shareAccountID !== account.id) {
            setLocalTransactionDetails((currState) => {
                return {
                    ...currState,
                    creditor_shares: {
                        [account.id]: 1.0,
                    },
                };
            });
        }
    };

    return (
        <AccountSelect
            group={group}
            value={shareAccountID === null ? null : getAccount(parseInt(shareAccountID))}
            onChange={onCreditorChange}
            noDisabledStyling={true}
            disabled={!isEditing}
            {...props}
        />
    );
}
