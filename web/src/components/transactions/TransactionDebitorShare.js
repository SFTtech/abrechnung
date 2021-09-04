import React from "react";
import {useRecoilValue} from "recoil";
import {groupAccounts} from "../../recoil/groups";
import {toast} from "react-toastify";
import AccountSelect from "../style/AccountSelect";
import {switchDebitorShare} from "../../api";


export default function TransactionDebitorShare({group, transaction, isEditing, ...props}) {
    const accounts = useRecoilValue(groupAccounts(group.id));
    const shareAccountID = Object.keys(transaction.debitor_shares).length === 0 ? null : Object.keys(transaction.debitor_shares)[0];

    const getAccount = (accountID) => {
        return accounts.find(account => account.id === accountID);
    }

    const onDebitorShareChange = (account) => {
        if (account === null) {
            return; // TODO: some error handling
        }
        switchDebitorShare({
            groupID: group.id,
            transactionID: transaction.id,
            accountID: account.id,
            value: 1.0,
        })
            .catch(err => {
                toast.error(err);
            })
    }


    return (
        <AccountSelect
            group={group}
            value={shareAccountID === null ? null : getAccount(parseInt(shareAccountID))}
            onChange={onDebitorShareChange}
            disabled={!isEditing}
            {...props}
        />
    );
}
