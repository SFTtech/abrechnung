import React from "react";
import {useRecoilValue, useSetRecoilState} from "recoil";
import {accountsSeenByUser} from "../../recoil/accounts";
import {toast} from "react-toastify";
import AccountSelect from "../style/AccountSelect";
import {switchCreditorShare} from "../../api";
import {groupTransactions, updateTransaction} from "../../recoil/transactions";


export default function TransactionCreditorShare({group, transaction, isEditing, ...props}) {
    const accounts = useRecoilValue(accountsSeenByUser(group.id));
    const shareAccountID = Object.keys(transaction.creditor_shares).length === 0 ? null : Object.keys(transaction.creditor_shares)[0];
    const setTransactions = useSetRecoilState(groupTransactions(transaction.group_id));

    const getAccount = (accountID) => {
        return accounts.find(account => account.id === accountID);
    };

    const onCreditorChange = (account) => {
        if (account === null) {
            return; // TODO: some error handling
        }
        if (shareAccountID !== account.id) {
            switchCreditorShare({
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
            value={shareAccountID === null ? null : getAccount(parseInt(shareAccountID))}
            onChange={onCreditorChange}
            noDisabledStyling={true}
            disabled={!isEditing}
            {...props}
        />
    );
}
