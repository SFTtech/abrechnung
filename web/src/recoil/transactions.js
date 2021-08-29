// transaction handling
import {atomFamily, selectorFamily} from "recoil";
import {groupAccounts} from "./groups";
import {fetchTransactions} from "../api";
import {ws} from "../websocket";
import {userData} from "./auth";

export const groupTransactions = atomFamily({
    key: "groupTransactions",
    default: selectorFamily({
        key: "groupTransactions/default",
        get: groupID => async ({get}) => {
            return await fetchTransactions({groupID: groupID});
        }
    }),
    effects_UNSTABLE: groupID => [
        ({setSelf, trigger}) => {
            ws.subscribe("transaction", groupID, ({subscription_type, transaction_id, element_id}) => {
                if (subscription_type === "transaction" && element_id === groupID) {
                    fetchTransactions({groupID: element_id}).then(result => setSelf(result));
                }
            })
            // TODO: handle registration errors

            return () => {
                ws.unsubscribe("transaction", groupID);
            };
        }
    ]
})

export const transactionsSeenByUser = selectorFamily({
    key: "transacitonsSeenByUser",
    get: groupID => async ({get}) => {
        const user = get(userData);
        const transactions = get(groupTransactions(groupID));
        return transactions.map(transaction => {
            if (transaction.pending_changes.hasOwnProperty(user.id)) {
                let t = {
                    ...transaction,
                    ...transaction.pending_changes[user.id],
                    is_wip: true,
                }
                delete t.pending_changes;
                delete t.editable_data;
                return t;
            } else {
                let t = {
                    ...transaction,
                    ...transaction.editable_data,
                    is_wip: false,
                }
                delete t.pending_changes;
                delete t.editable_data;
                return t;
            }

        })
    }
})

export const transactionById = selectorFamily({
    key: "transactionById",
    get: ({groupID, transactionID}) => async ({get}) => {
        const transactions = get(transactionsSeenByUser(groupID));
        return transactions?.find(transaction => transaction.id === transactionID);
    }
})

export const accountBalances = selectorFamily({
    key: "accountBalances",
    get: (groupID) => async ({get}) => {
        const transactions = get(transactionsSeenByUser(groupID));
        const accounts = get(groupAccounts(groupID));
        let accountBalances = Object.fromEntries(accounts.map(account => [account.id, 0]));
        for (const transaction of transactions) {
            const totalDebitorShares = Object.values(transaction.debitor_shares).reduce((acc, curr) => acc + curr, 0);
            const totalCreditorShares = Object.values(transaction.creditor_shares).reduce((acc, curr) => acc + curr, 0);

            Object.entries(transaction.debitor_shares).forEach(([accountID, value]) => {
                accountBalances[accountID] -= transaction.value / totalDebitorShares * value;
            })
            Object.entries(transaction.creditor_shares).forEach(([accountID, value]) => {
                accountBalances[accountID] += transaction.value / totalCreditorShares * value;
            })
        }
        return accountBalances;
    }
})
