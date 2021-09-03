// transaction handling
import {atomFamily, selectorFamily} from "recoil";
import {groupAccounts} from "./groups";
import {fetchTransactions} from "../api";
import {ws} from "../websocket";
import {userData} from "./auth";
import {DateTime} from "luxon";

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
                    fetchTransactions({groupID: element_id}).then(result => {
                        setSelf(result);
                    });
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

        return transactions
            .filter(transaction => {
                if (transaction.current_state && transaction.current_state.deleted) {
                    return false;
                }
                if (transaction.pending_changes.hasOwnProperty(user.id)) {
                    return true;
                } else if (transaction.current_state === null) {
                    return false;
                }
                return true;
            })
            .map(transaction => {
                if (transaction.pending_changes.hasOwnProperty(user.id)) {
                    return {
                        id: transaction.id,
                        type: transaction.type,
                        ...transaction.pending_changes[user.id],
                        is_wip: true,
                        has_committed_changes: transaction.current_state != null,
                    };
                } else {
                    return {
                        id: transaction.id,
                        type: transaction.type,
                        ...transaction.current_state,
                        is_wip: false,
                        has_committed_changes: true,
                    };
                }

            })
            .sort((t1, t2) => DateTime.fromISO(t1.billed_at) < DateTime.fromISO(t2.billed_at))
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
            if (transaction.deleted) {
                continue; // ignore deleted transactions
            }
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
