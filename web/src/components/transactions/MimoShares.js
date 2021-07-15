import {useRecoilValue} from "recoil";
import {groupAccounts} from "../../recoil/groups";
import {transactionCreditorShares, transactionDebitorShares} from "../../recoil/transactions";

export default function MimoShares ({group, transaction}) {
    const accounts = useRecoilValue(groupAccounts(group.group_id));
    const creditorShares = useRecoilValue(transactionCreditorShares(transaction.transaction_id));
    const debitorShares = useRecoilValue(transactionDebitorShares(transaction.transaction_id));

    return (
        <div></div>
    )
}
