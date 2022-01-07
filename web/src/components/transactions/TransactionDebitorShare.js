import React from "react";
import {useRecoilValue, useSetRecoilState} from "recoil";
import {accountsSeenByUser} from "../../recoil/accounts";
import {toast} from "react-toastify";
import AccountSelect from "../style/AccountSelect";
import {switchDebitorShare} from "../../api";
import {groupTransactions, updateTransaction} from "../../recoil/transactions";


export default function TransactionDebitorShare({group, transaction, isEditing, ...props}) {
    const accounts = useRecoilValue(accountsSeenByUser(group.id));
    const shareAccountID = Object.keys(transaction.debitor_shares).length === 0 ? null : Object.keys(transaction.debitor_shares)[0];
    const setTransactions = useSetRecoilState(groupTransactions(transaction.group_id));

    const getAccount = (accountID) => {
        return accounts.find(account => account.id === accountID);
    };

    const onDebitorShareChange = (account) => {
        if (account === null) {
            return; // TODO: some error handling
        }
        if (shareAccountID !== account.id) {
            switchDebitorShare({
                groupID: group.id,
                transactionID: transaction.id,
                accountID: account.id,
                value: 1.0
            })
                .then(t => {
                    updateTransaction(t, setTransactions);
                })
                .catch(err => {
                    toast.error(err);
                });
        }
    };


    return (
        <AccountSelect
            group={group}
            noDisabledStyling={true}
            value={shareAccountID === null ? null : getAccount(parseInt(shareAccountID))}
            onChange={onDebitorShareChange}
            disabled={!isEditing}
            {...props}
        />
    );
}
