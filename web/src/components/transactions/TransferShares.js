import {useRecoilValue} from "recoil";
import {groupAccounts} from "../../recoil/groups";
import {
    createDebitorShare,
    transactionCreditorShares,
    transactionDebitorShares,
    updateDebitorShare
} from "../../recoil/transactions";
import AccountSelect from "../style/AccountSelect";
import {toast} from "react-toastify";
import TransactionCreditorShare from "./TransactionCreditorShare";


export default function TransferShares({group, transaction, wipRevision}) {
    const accounts = useRecoilValue(groupAccounts(group.group_id));
    // TODO: sanity checking
    const creditorShares = useRecoilValue(transactionCreditorShares(transaction.transaction_id));
    const creditorShare = creditorShares.length ? creditorShares[0] : null;
    const debitorShares = useRecoilValue(transactionDebitorShares(transaction.transaction_id));
    const debitorShare = debitorShares.length ? debitorShares[0] : null;

    const getAccount = (accountID) => {
        return accounts.find(account => account.account_id === accountID);
    }

    const onDebitorChange = (account) => {
        if (account === null) {
            return; // TODO: some error handling
        }
        if (debitorShare) {
            updateDebitorShare({
                transactionID: transaction.transaction_id,
                debitorShareID: debitorShare.debitor_share_id,
                revisionID: wipRevision.revision_id,
                accountID: account.account_id,
                shares: 1.0,
                description: ""
            })
                .catch(err => {
                    toast.error(`Error updating creditor: ${err}!`);
                })
        } else {
            createDebitorShare({
                transactionID: transaction.transaction_id,
                revisionID: wipRevision.revision_id,
                accountID: account.account_id,
                shares: 1.0,
                description: ""
            })
                .catch(err => {
                    toast.error(`Error updating creditor: ${err}!`);
                })
        }
    }

    return (
        <div>
            <TransactionCreditorShare
                group={group}
                transaction={transaction}
                creditorShare={creditorShare}
                wipRevision={wipRevision}
                label="From"
            />
            <AccountSelect
                group={group}
                value={debitorShare === null ? null : getAccount(debitorShare.account_id)}
                onChange={onDebitorChange}
                disabled={wipRevision === null}
                margin="normal"
                label="To"
            />
        </div>
    )
}