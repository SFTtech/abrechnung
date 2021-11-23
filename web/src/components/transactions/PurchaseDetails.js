import React from "react";
import PurchaseDebitorShares from "../../components/transactions/PurchaseDebitorShares";
import TransactionCreditorShare from "./TransactionCreditorShare";
import TransactionDescription from "./TransactionDescription";
import TransactionBilledAt from "./TransactionBilledAt";
import TransactionValue from "./TransactionValue";

export default function PurchaseDetails({group, transaction}) {
    return (
        <>
            <TransactionDescription group={group} transaction={transaction}/>
            <TransactionBilledAt group={group} transaction={transaction}/>

            <TransactionCreditorShare
                group={group}
                transaction={transaction}
                isEditing={transaction.is_wip}
                label="Paid for by"
            />

            <TransactionValue group={group} transaction={transaction}/>

            <PurchaseDebitorShares group={group} transaction={transaction} isEditing={transaction.is_wip}/>
        </>
    );
}

