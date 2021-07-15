// transaction handling
import {ws} from "../websocket";
import {atomFamily, selectorFamily} from "recoil";
import {fetchToken} from "./auth";

const fetchGroupTransactions = async groupID => {
    return ws.call("transaction_list", {
        authtoken: fetchToken(),
        group_id: groupID,
    });
}

export const groupTransactions = atomFamily({
    key: "groupTransactions",
    default: selectorFamily({
        key: "groupTransactions/default",
        get: groupID => async ({get}) => {
            return await fetchGroupTransactions(groupID);
        }
    }),
    effects_UNSTABLE: groupID => [
        ({setSelf, trigger}) => {
            ws.subscribe(fetchToken(), "transaction", ({element_id}) => {
                if (element_id === groupID) {
                    console.log("reloading group transactions")
                    fetchGroupTransactions(groupID).then(result => setSelf(result));
                }
            }, {element_id: groupID})
            // TODO: handle registration errors

            return () => {
                ws.unsubscribe("transaction", {element_id: groupID});
            };
        }
    ]
})

export const transaction = selectorFamily({
    key: "transaction",
    get: ({groupID, transactionID}) => async ({get}) => {
        const transactions = get(groupTransactions(groupID));
        return transactions?.find(transaction => transaction.transaction_id === transactionID);
    }
})

const fetchDebitorShares = async transactionID => {
    return ws.call("transaction_debitor_shares_list", {
        authtoken: fetchToken(),
        transaction_id: transactionID,
    });
}

export const transactionDebitorShares = atomFamily({
    key: "transactionDebitorShares",
    default: selectorFamily({
        key: "transactionDebitorShares/default",
        get: (transactionID) => async ({get}) => {
            return await fetchDebitorShares(transactionID);
        }
    }),
    effects_UNSTABLE: transactionID => [
        ({setSelf, trigger}) => {
            ws.subscribe(fetchToken(), "debitor_share", ({element_id}) => {
                if (element_id === transactionID) {
                    console.log("reloading transactions debitor shares for ID ", transactionID)
                    fetchDebitorShares(transactionID).then(result => setSelf(result));
                }
            }, {element_id: transactionID})
            // TODO: handle registration errors

            return () => {
                ws.unsubscribe("debitor_share", {element_id: transactionID});
            };
        }
    ]
})

export const transactionTotalDebitorShares = selectorFamily({
    key: "transactionTotalDebitorShares",
    get: (transactionID) => async ({get}) => {
        const shares = get(transactionDebitorShares(transactionID));
        return shares.reduce((acc, currVal) => currVal.valid ? acc + currVal.shares : acc, 0);
    }
})

const fetchCreditorShares = async transactionID => {
    return ws.call("transaction_creditor_shares_list", {
        authtoken: fetchToken(),
        transaction_id: transactionID,
    });
}

export const transactionCreditorShares = atomFamily({
    key: "transactionCreditorShares",
    default: selectorFamily({
        key: "transactionCreditorShares/default",
        get: (transactionID) => async ({get}) => {
            return await fetchCreditorShares(transactionID);
        }
    }),
    effects_UNSTABLE: transactionID => [
        ({setSelf, trigger}) => {
            ws.subscribe(fetchToken(), "creditor_share", ({element_id}) => {
                if (element_id === transactionID) {
                    console.log("reloading transactions creditor shares for ID ", transactionID)
                    fetchCreditorShares(transactionID).then(result => setSelf(result));
                }
            }, {element_id: transactionID})
            // TODO: handle registration errors

            return () => {
                ws.unsubscribe("creditor_share", {element_id: transactionID});
            };
        }
    ]
})

export const createTransaction = async ({
                                            groupID,
                                            type,
                                            description,
                                            currencySymbol,
                                            currencyConversionRate,
                                            value
                                        }) => {
    const result = await ws.call("transaction_create", {
        authtoken: fetchToken(),
        group_id: groupID,
        type: type,
        description: description,
        currency_symbol: currencySymbol,
        currency_conversion_rate: currencyConversionRate,
        value: value,
    })
    return result[0];
}

export const startEditTransaction = async ({transactionID}) => {
    const result = await ws.call("transaction_edit", {
        authtoken: fetchToken(),
        transaction_id: transactionID
    })
    return result[0].revision_id;
}

export const discardRevision = async ({revisionID}) => {
    return await ws.call("discard_revision", {
        authtoken: fetchToken(),
        revision_id: revisionID
    })
}

export const commitRevision = async ({revisionID}) => {
    return await ws.call("commit_revision", {
        authtoken: fetchToken(),
        revision_id: revisionID
    })
}

export const updateTransaction = async ({
                                            transactionID,
                                            revisionID,
                                            currencySymbol,
                                            currencyConversionRate,
                                            value,
                                            description
                                        }) => {
    await ws.call("transaction_history_update", {
        authtoken: fetchToken(),
        revision_id: revisionID,
        transaction_id: transactionID,
        description: description,
        currency_symbol: currencySymbol,
        currency_conversion_rate: currencyConversionRate,
        value: value,
    })
}

export const createCreditorShare = async ({
                                              transactionID,
                                              revisionID,
                                              accountID,
                                              shares,
                                              description
                                          }) => {
    return await ws.call("transaction_creditor_share_create", {
        authtoken: fetchToken(),
        revision_id: revisionID,
        transaction_id: transactionID,
        account_id: accountID,
        shares: shares,
        description: description,
    })
}

export const updateCreditorShare = async ({
                                              creditorShareID,
                                              revisionID,
                                              accountID,
                                              shares,
                                              description,
                                              valid = true
                                          }) => {
    return await ws.call("transaction_creditor_share_update", {
        authtoken: fetchToken(),
        creditor_share_id: creditorShareID,
        revision_id: revisionID,
        account_id: accountID,
        shares: shares,
        description: description,
        valid: valid
    })
}

export const createDebitorShare = async ({transactionID, revisionID, accountID, shares, description}) => {
    return await ws.call("transaction_debitor_share_create", {
        authtoken: fetchToken(),
        revision_id: revisionID,
        transaction_id: transactionID,
        account_id: accountID,
        shares: shares,
        description: description,
    })
}

export const updateDebitorShare = async ({
                                             debitorShareID,
                                             revisionID,
                                             accountID,
                                             shares,
                                             description,
                                             valid = true
                                         }) => {
    return await ws.call("transaction_debitor_share_update", {
        authtoken: fetchToken(),
        debitor_share_id: debitorShareID,
        revision_id: revisionID,
        account_id: accountID,
        shares: shares,
        description: description,
        valid: valid
    })
}
