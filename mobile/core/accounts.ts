import { atomFamily, selectorFamily } from "recoil";
import { Account, AccountType, ClearingShares } from "./types";
import { accountNotifier, getAccount, getAccounts } from "./database/accounts";
import { positionState, transactionState } from "./transactions";

function filterAccounts(account: Account[]): Account[] {
    return account.filter(a => !a.deleted);
}

export const accountState = atomFamily<Account[], number>({
    key: "accountState",
    default: groupID => groupID === null ? [] : (async () => filterAccounts(await getAccounts(groupID)))(),
    effects: groupID => [
        ({ setSelf }) => {
            return accountNotifier.subscribe(groupID, (payload) => {
                if (payload.account_id === undefined) {
                    getAccounts(groupID).then(result => setSelf(filterAccounts(result)));
                } else {
                    getAccount(groupID, payload.account_id).then(account => {
                        setSelf(currVal => {
                            return (<Account[]>currVal).map(a => a.id === account.id ? account : a);
                        });
                    });
                }
            });
        },
    ],
});

type accountListFilter = {
    groupID: number,
    accountType: AccountType,
}

export const accountStateByType = selectorFamily<Account[], accountListFilter>({
    key: "accountStateByType",
    get: ({ groupID, accountType }) => ({ get }) => {
        const accounts = get(accountState(groupID));
        return accounts.filter(a => a.type === accountType);
    },
});

export const personalAccountState = selectorFamily<Account[], number>({
    key: "personalAccountState",
    get: groupID => ({ get }) => {
        const accounts = get(accountState(groupID));
        return accounts.filter(acc => acc.type === "personal");
    },
});

export const clearingAccountState = selectorFamily<Account[], number>({
    key: "clearingAccountState",
    get: groupID => ({ get }) => {
        const accounts = get(accountState(groupID));
        return accounts.filter(acc => acc.type === "clearing");
    },
});

type accountIdentifierParam = {
    groupID: number,
    accountID: number,
}

export const accountByIDState = selectorFamily<Account, accountIdentifierParam>({
    key: "accountByIDState",
    get: ({ groupID, accountID }) => ({ get }) => {
        const accounts = get(accountState(groupID));
        return accounts.find(acc => acc.id === accountID);
    },
});

export type AccountBalance = {
    balance: number;
    before_clearing: number;
    total_consumed: number;
    total_paid: number;
    clearing_resolution: any; //TODO: figure out
}

export type AccountBalanceMap = {
    [k: number]: AccountBalance
}

export const accountBalancesState = selectorFamily<AccountBalanceMap, number>({
    key: "accountBalancesState",
    get:
        (groupID) =>
            async ({ get }) => {
                const transactions = get(transactionState(groupID));
                const positions = get(positionState(groupID));
                const accounts = get(accountState(groupID));
                let accountBalances: AccountBalanceMap = Object.fromEntries(
                    accounts.map((account) => [
                        account.id,
                        {
                            balance: 0,
                            before_clearing: 0,
                            total_consumed: 0,
                            total_paid: 0,
                            clearing_resolution: {},
                        },
                    ]),
                );

                let transactionValueAfterPositions: { [k: number]: number } = transactions.reduce((map, curr) => {
                    map[curr.id] = curr.value;
                    return map;
                }, {});

                for (const position of positions) {
                    if (position.deleted) {
                        continue; // ignore deleted positions
                    }
                    const totalUsages = position.communist_shares + Object.values(position.usages).reduce((acc, curr) => acc + curr, 0);
                    Object.entries(position.usages).forEach(([accountID, value]) => {
                        const change = position.price * value / totalUsages;
                        accountBalances[accountID].balance += -change;
                        accountBalances[accountID].total_consumed += change;
                        accountBalances[accountID].before_clearing = accountBalances[accountID].balance;
                    });
                    const commonRemainder =
                        totalUsages > 0 ? (position.price / totalUsages) * position.communist_shares : 0;
                    transactionValueAfterPositions[position.transaction_id] = transactionValueAfterPositions[position.transaction_id] - position.price + commonRemainder;
                }
                for (const transaction of transactions) {
                    if (transaction.deleted) {
                        continue; // ignore deleted transactions
                    }
                    const totalCreditors = Object.values(transaction.creditor_shares).reduce((acc, curr) => acc + curr, 0);
                    const totalDebitors = Object.values(transaction.debitor_shares).reduce((acc, curr) => acc + curr, 0);
                    Object.entries(transaction.creditor_shares).forEach(([accountID, value]) => {
                        const change = transaction.value * value / totalCreditors;
                        accountBalances[accountID].balance += change;
                        accountBalances[accountID].total_paid += change;
                        accountBalances[accountID].before_clearing = accountBalances[accountID].balance;
                    });
                    Object.entries(transaction.debitor_shares).forEach(([accountID, value]) => {
                        const change = transactionValueAfterPositions[transaction.id] * value / totalDebitors;
                        accountBalances[accountID].balance += -change;
                        accountBalances[accountID].total_consumed += change;
                        accountBalances[accountID].before_clearing = accountBalances[accountID].balance;
                    });
                }

                // linearize the account dependency graph to properly redistribute clearing accounts
                const shareMap: Map<number, ClearingShares> = accounts.reduce((map, acc) => {
                    if (acc.clearing_shares != null && Object.keys(acc.clearing_shares).length) {
                        map.set(acc.id, acc.clearing_shares);
                    }
                    return map;
                }, new Map<number, ClearingShares>());
                let clearingDependencies: { [k: number]: Set<number> } = {};
                let inDegree = accounts.reduce((map: { [k: number]: number }, curr) => {
                    map[curr.id] = 0;
                    return map;
                }, {});
                shareMap.forEach((shares: ClearingShares, accountID: number) => {
                    // TODO: maybe functionalize
                    for (const nextAccountID of Object.keys(shares)) {
                        if (shareMap.hasOwnProperty(nextAccountID)) {
                            inDegree[parseInt(nextAccountID)] += 1;
                        }
                        if (clearingDependencies.hasOwnProperty(nextAccountID)) {
                            clearingDependencies[parseInt(nextAccountID)].add(accountID);
                        } else {
                            clearingDependencies[parseInt(nextAccountID)] = new Set<number>([accountID]);
                        }
                    }
                });
                let zeroDegreeAccounts: Array<number> = [...shareMap.keys()].filter(
                    (accountID) => inDegree[accountID] === 0,
                );
                let sorting = [];

                while (zeroDegreeAccounts.length > 0) {
                    const node = zeroDegreeAccounts.pop();
                    if (node === undefined) {
                        throw new Error("error computing transaction balances");
                    }
                    const shares = shareMap.get(node);
                    if (shares !== undefined) {
                        sorting.push(node);
                        for (const nextAccount of Object.keys(shares)) {
                            inDegree[parseInt(nextAccount)] -= 1;
                            if (inDegree[parseInt(nextAccount)] <= 0) {
                                zeroDegreeAccounts.push(parseInt(nextAccount));
                            }
                        }
                    }
                }

                for (const clearing of sorting) {
                    const clearingShares = shareMap.get(clearing);
                    if (clearingShares === undefined || Object.keys(clearingShares).length === 0) {
                        continue;
                    }

                    const toSplit = accountBalances[clearing].balance;
                    accountBalances[clearing].balance = 0;
                    const totalShares = Object.values(clearingShares).reduce((acc: number, curr: number) => curr + acc, 0);
                    for (const acc in clearingShares) {
                        const accShare = (toSplit * clearingShares[acc]) / totalShares;
                        if (accountBalances[clearing].clearing_resolution.hasOwnProperty(acc)) {
                            accountBalances[clearing].clearing_resolution[acc] += accShare;
                        } else {
                            accountBalances[clearing].clearing_resolution[acc] = accShare;
                        }
                        accountBalances[acc].balance += accShare;
                        if (accShare > 0) {
                            accountBalances[acc].total_paid += Math.abs(accShare);
                        } else {
                            accountBalances[acc].total_consumed += Math.abs(accShare);
                        }
                    }
                }

                return accountBalances;
            },

});
