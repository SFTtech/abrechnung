import EditableField from "../EditableField";
import React from "react";
import {useRecoilValue} from "recoil";
import {sessionToken} from "../../recoil/auth";
import {updateTransaction} from "../../recoil/transactions";

export default function TransactionDetail({group, transaction, wipRevision}) {
    const authtoken = useRecoilValue(sessionToken);
    const editing = wipRevision !== null;

    const save = (params) => {
        if (wipRevision !== null) {
            updateTransaction({
                sessionToken: authtoken,
                transactionID: transaction.transaction_id,
                revisionID: wipRevision.revision_id,
                currencyConversionRate: transaction.currency_conversion_rate,
                currencySymbol: transaction.currency_symbol,
                value: transaction.value,
                description: transaction.description,
                ...params
            }).then(result => {
            }).catch(err => {
                // something else
            })
        }
    }

    return (
        <div>
            <span className="font-weight-bold">Description</span>
            <div className="d-flex justify-content-between">
                {editing ? (
                    <EditableField value={transaction.description}
                                   onChange={(newValue) => save({description: newValue})}/>
                ) : (
                    <span className="text-field">{transaction.description}</span>
                )}
            </div>
            <span className="font-weight-bold">Value</span>
            <div className="d-flex justify-content-between">
                {editing ? (
                    <EditableField value={transaction.value}
                                   onChange={(newValue) => save({value: parseFloat(newValue)})}/>
                ) : (
                    <span className="text-field">{transaction.value}</span>
                )}
            </div>
            <span className="font-weight-bold">Currency</span>
            <div className="d-flex justify-content-between">
                {editing ? (
                    <EditableField value={transaction.currency_symbol}
                                   onChange={(newValue) => save({currencySymbol: newValue})}/>
                ) : (
                    <span className="text-field">{transaction.currency_symbol}</span>
                )}
            </div>
        </div>
    )
}