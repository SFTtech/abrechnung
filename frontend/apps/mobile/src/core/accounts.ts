import { atomFamily, selectorFamily, useRecoilValue } from "recoil";
import { Account, AccountType, AccountBalanceMap } from "@abrechnung/types";
import { accountNotifier, getAccount, getAccounts } from "./database/accounts";
import { positionState, transactionState } from "./transactions";
import { computeAccountBalances } from "@abrechnung/core";
import { useNavigation } from "@react-navigation/native";
import { RootDrawerNavigationProp } from "../navigation/types";

function filterAccounts(account: Account[]): Account[] {
    return account.filter((a) => !a.deleted);
}

export const accountState = atomFamily<Account[], number>({
    key: "accountState",
    default: (groupID) => (groupID === null ? [] : (async () => filterAccounts(await getAccounts(groupID)))()),
    effects: (groupID) => [
        ({ setSelf }) => {
            return accountNotifier.on("changed", (payload) => {
                if (payload.groupID !== groupID) {
                    return;
                }

                if (payload.accountID === undefined) {
                    getAccounts(groupID).then((result) => setSelf(filterAccounts(result)));
                } else {
                    getAccount(groupID, payload.accountID).then((account) => {
                        setSelf((currVal) => {
                            return (currVal as Account[]).map((a) => (a.id === account.id ? account : a));
                        });
                    });
                }
            });
        },
    ],
});

type accountListFilter = {
    groupID: number;
    accountType: AccountType;
};

export const accountStateByType = selectorFamily<Account[], accountListFilter>({
    key: "accountStateByType",
    get:
        ({ groupID, accountType }) =>
        ({ get }) => {
            const accounts = get(accountState(groupID));
            return accounts.filter((a) => a.type === accountType);
        },
});

export const personalAccountState = selectorFamily<Account[], number>({
    key: "personalAccountState",
    get:
        (groupID) =>
        ({ get }) => {
            const accounts = get(accountState(groupID));
            return accounts.filter((acc) => acc.type === "personal");
        },
});

export const clearingAccountState = selectorFamily<Account[], number>({
    key: "clearingAccountState",
    get:
        (groupID) =>
        ({ get }) => {
            const accounts = get(accountState(groupID));
            return accounts.filter((acc) => acc.type === "clearing");
        },
});

type accountIdentifierParam = {
    groupID: number;
    accountID: number;
};

export const accountByIDState = selectorFamily<Account | undefined, accountIdentifierParam>({
    key: "accountByIDState",
    get:
        ({ groupID, accountID }) =>
        ({ get }) => {
            const accounts = get(accountState(groupID));
            return accounts.find((acc) => acc.id === accountID);
        },
});

export const useAccount = (groupID: number, accountID: number): Account => {
    const account = useRecoilValue(accountByIDState({ groupID, accountID }));
    const navigation = useNavigation();
    if (account == null) {
        navigation.navigate("AccountList", { groupID: groupID });
        throw new Error("account was null unexpectedly");
    }
    return account;
};

export const accountBalancesState = selectorFamily<AccountBalanceMap, number>({
    key: "accountBalancesState",
    get:
        (groupID) =>
        async ({ get }) => {
            const transactions = get(transactionState(groupID));
            const positions = get(positionState(groupID));
            const accounts = get(accountState(groupID));
            return computeAccountBalances(accounts, transactions, positions);
        },
});
