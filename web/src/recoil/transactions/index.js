// transaction handling
import {ws} from "../../websocket";
import {atomFamily, selectorFamily} from "recoil";
import {sessionToken} from "../auth";

export const groupTransactions = atomFamily({
    key: "groupTransactions",
    default: selectorFamily({
        key: "groupTransactions/default",
        get: groupID => async ({get}) => {
            return ws.call("transaction_list", {
                authtoken: get(sessionToken),
                group_id: groupID,
            });
        }
    })
})

export const transaction = selectorFamily({
    key: "transaction",
    get: ({groupID, transactionID}) => async ({get}) => {
        const transactions = get(groupTransactions(groupID));
        return transactions?.find(transaction => transaction.transaction_id === transactionID);
    }
})

export const transactionDebitorShares = atomFamily({
    key: "transactionDebitorShares",
    default: selectorFamily({
        key: "transactionDebitorShares/default",
        get: ({groupID, transactionID}) => async ({get}) => {
            return ws.call("transaction_debitor_shares_list", {
                authtoken: get(sessionToken),
                group_id: groupID,
                transaction_id: transactionID,
            });
        }
    })
})

export const transactionCreditorShares = atomFamily({
    key: "transactionCreditorShares",
    default: selectorFamily({
        key: "transactionCreditorShares/default",
        get: ({groupID, transactionID}) => async ({get}) => {
            return ws.call("transaction_creditor_shares_list", {
                authtoken: get(sessionToken),
                group_id: groupID,
                transaction_id: transactionID,
            });
        }
    })
})

export const fetchTransactionDetail = async ({sessionToken, groupID, transactionID}) => {
    return ws.call("transaction_detail", {
        authtoken: sessionToken,
        group_id: groupID,
        transaction_id: transactionID
    });
}

export const createTransaction = async ({
                                            sessionToken,
                                            groupID,
                                            type,
                                            description,
                                            currencySymbol,
                                            currencyConversionRate,
                                            value
                                        }) => {
    const result = ws.call("transaction_create", {
        authtoken: sessionToken,
        group_id: groupID,
        type: type,
        description: description,
        currency_symbol: currencySymbol,
        currency_conversion_rate: currencyConversionRate,
        value: value,
    })

    const transaction = {
        transaction_id: result[0].transaction_id,
        type: this.state.type,
        history: [
            {
                revision_id: result.revision_id,
                currency_symbol: this.state.currencySymbol,
                currency_conversion_rate: this.state.currencyConversionRate,
                value: this.state.value,
            }
        ]
    };

    return transaction;
}