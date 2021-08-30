import {useRecoilValue} from "recoil";
import {groupAccounts} from "../../recoil/groups";
import AccountSelect from "../style/AccountSelect";
import {toast} from "react-toastify";
import TransactionCreditorShare from "./TransactionCreditorShare";
import {switchDebitorShare} from "../../api";


export default function TransferShares({group, transaction, isEditing}) {
    const accounts = useRecoilValue(groupAccounts(group.id));
    const debitorShareAccountID = Object.keys(transaction.debitor_shares).length === 0 ? null : Object.keys(transaction.debitor_shares)[0];

    const getAccount = (accountID) => {
        return accounts.find(account => account.id === accountID);
    }

    const onDebitorChange = (account) => {
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
        <div>
            <TransactionCreditorShare
                group={group}
                transaction={transaction}
                isEditing={isEditing}
                label="From"
            />
            <AccountSelect
                group={group}
                value={debitorShareAccountID === null ? null : getAccount(parseInt(debitorShareAccountID))}
                onChange={onDebitorChange}
                disabled={!isEditing}
                margin="normal"
                label="To"
            />
        </div>
    )
}