import React from "react";
import {useRecoilValue} from "recoil";
import {groupAccounts} from "../../recoil/groups";
import {toast} from "react-toastify";
import AccountSelect from "../style/AccountSelect";
import {switchCreditorShare} from "../../api";


export default function TransactionCreditorShare({group, transaction, isEditing, ...props}) {
    const accounts = useRecoilValue(groupAccounts(group.id));
    const shareAccountID = Object.keys(transaction.creditor_shares).length === 0 ? null : Object.keys(transaction.creditor_shares)[0];

    const getAccount = (accountID) => {
        return accounts.find(account => account.id === accountID);
    }

    const onCreditorChange = (account) => {
        if (account === null) {
            return; // TODO: some error handling
        }
        switchCreditorShare({
            groupID: group.id,
            transactionID: transaction.id,
            accountID: account.id,
            value: 1.0,
        })
            .catch(err => {
                toast.error(`Error updating creditor: ${err}!`);
            })
    }


    return (
        <AccountSelect
            group={group}
            value={shareAccountID === null ? null : getAccount(parseInt(shareAccountID))}
            onChange={onCreditorChange}
            disabled={!isEditing}
            {...props}
        />
    );
}
