import {useRecoilValue} from "recoil";
import {groupAccounts} from "../../recoil/groups";
import {
    createDebitorShare,
    updateDebitorShare
} from "../../recoil/transactions";
import AccountSelect from "../style/AccountSelect";
import {toast} from "react-toastify";
import TransactionCreditorShare from "./TransactionCreditorShare";


export default function TransferShares({group, transaction, wipRevision}) {
    const accounts = useRecoilValue(groupAccounts(group.id));
    // TODO: sanity checking
    const creditorShares = transaction.creditor_shares;
    const creditorShare = creditorShares.length ? creditorShares[0] : null;
    const debitorShares = transaction.debitor_shares;
    const debitorShare = debitorShares.length ? debitorShares[0] : null;

    const getAccount = (accountID) => {
        return accounts.find(account => account.id === accountID);
    }

    const onDebitorChange = (account) => {
        if (account === null) {
            return; // TODO: some error handling
        }
        if (debitorShare) {
            updateDebitorShare({
                transactionID: transaction.id,
                debitorShareID: debitorShare.id,
                revisionID: wipRevision.id,
                accountID: account.id,
                shares: 1.0,
                description: ""
            })
                .catch(err => {
                    toast.error(`Error updating creditor: ${err}!`);
                })
        } else {
            createDebitorShare({
                transactionID: transaction.id,
                revisionID: wipRevision.id,
                accountID: account.id,
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