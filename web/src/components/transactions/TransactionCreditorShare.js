import React from "react";
import {useRecoilValue} from "recoil";
import {createCreditorShare, updateCreditorShare} from "../../recoil/transactions";
import {groupAccounts} from "../../recoil/groups";
import {toast} from "react-toastify";
import AccountSelect from "../style/AccountSelect";


export default function TransactionCreditorShare({group, transaction, creditorShare, wipRevision, ...props}) {
    const accounts = useRecoilValue(groupAccounts(group.id));

    const getAccount = (accountID) => {
        return accounts.find(account => account.id === accountID);
    }

    const onCreditorChange = (account) => {
        if (account === null) {
            return; // TODO: some error handling
        }
        if (creditorShare) {
            updateCreditorShare({
                creditorShareID: creditorShare.id,
                revisionID: wipRevision.id,
                accountID: account.id,
                shares: 1.0,
                description: ""
            })
                .then(() => {
                    toast.success(`Updated share!`);
                })
                .catch(err => {
                    toast.error(`Error updating creditor: ${err}!`);
                })
        } else {
            createCreditorShare({
                transactionID: transaction.id,
                revisionID: wipRevision.id,
                accountID: account.id,
                shares: 1.0,
                description: ""
            })
                .then(() => {
                    toast.success(`Updated share!`);
                })
                .catch(err => {
                    toast.error(`Error updating creditor: ${err}!`);
                })
        }
    }


    return (
        <AccountSelect
            group={group}
            value={creditorShare === null ? null : getAccount(creditorShare.id)}
            onChange={onCreditorChange}
            disabled={wipRevision === null}
            {...props}
        />
    );
}
