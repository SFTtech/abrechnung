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
        get: (transactionID) => async ({get}) => {
            return ws.call("transaction_debitor_shares_list", {
                authtoken: get(sessionToken),
                transaction_id: transactionID,
            });
        }
    })
})

export const transactionCreditorShares = atomFamily({
    key: "transactionCreditorShares",
    default: selectorFamily({
        key: "transactionCreditorShares/default",
        get: (transactionID) => async ({get}) => {
            return ws.call("transaction_creditor_shares_list", {
                authtoken: get(sessionToken),
                transaction_id: transactionID,
            });
        }
    })
})

export const createTransaction = async ({
                                            sessionToken,
                                            groupID,
                                            type,
                                            description,
                                            currencySymbol,
                                            currencyConversionRate,
                                            value
                                        }) => {
    const result = await ws.call("transaction_create", {
        authtoken: sessionToken,
        group_id: groupID,
        type: type,
        description: description,
        currency_symbol: currencySymbol,
        currency_conversion_rate: currencyConversionRate,
        value: value,
    })
    return result[0];
}

export const startEditTransaction = async ({sessionToken, transactionID}) => {
    const result = await ws.call("transaction_edit", {
        authtoken: sessionToken,
        transaction_id: transactionID
    })
    return result[0].revision_id;
}

export const discardRevision = async ({sessionToken, revisionID}) => {
    await ws.call("discard_revision", {
        authtoken: sessionToken,
        revision_id: revisionID
    })
}

export const commitRevision = async ({sessionToken, revisionID}) => {
    await ws.call("commit_revision", {
        authtoken: sessionToken,
        revision_id: revisionID
    })
}

export const updateTransaction = async ({sessionToken, transactionID, revisionID, currencySymbol, currencyConversionRate, value, description}) => {
    await ws.call("transaction_history_update", {
        authtoken: sessionToken,
        revision_id: revisionID,
        transaction_id: transactionID,
        description: description,
        currency_symbol: currencySymbol,
        currency_conversion_rate: currencyConversionRate,
        value: value,
    })
}
