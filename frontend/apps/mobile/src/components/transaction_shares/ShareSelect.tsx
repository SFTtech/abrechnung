import React from "react";
import { Checkbox, List, Searchbar } from "react-native-paper";
import { ScrollView, View } from "react-native";
import { useEffect, useState } from "react";
import { useRecoilValue } from "recoil";
import { accountState } from "../../core/accounts";
import { createComparator, lambdaComparator } from "@abrechnung/utils";
import { useActiveGroupID } from "../../core/groups";
import { Account, TransactionShare } from "@abrechnung/types";

interface Props {
    value: TransactionShare;
    onChange: (value: TransactionShare) => void;
    title: string;
    disabled?: boolean;
    enableAdvanced?: boolean;
    multiSelect?: boolean;
}

export const ShareSelect: React.FC<Props> = ({
    value,
    onChange,
    title,
    disabled = false,
    enableAdvanced = false,
    multiSelect = true,
}) => {
    const groupID = useActiveGroupID();
    const [shares, setShares] = useState({});
    const [searchTerm, setSearchTerm] = useState("");
    const accounts = useRecoilValue(accountState(groupID));
    const [filteredAccounts, setFilteredAccounts] = useState<Account[]>([]);

    const toggleShare = (account_id: number) => {
        const currVal = shares.hasOwnProperty(account_id) ? shares[account_id] : 0;
        if (multiSelect) {
            setShares((shares) => {
                const newShares = { ...shares };
                if (currVal > 0) {
                    delete newShares[account_id];
                } else {
                    newShares[account_id] = 1;
                }
                return newShares;
            });
        } else {
            setShares(currVal > 0 ? {} : { [account_id]: 1 });
        }
    };

    useEffect(() => {
        setFilteredAccounts(
            accounts
                .filter(
                    (acc) =>
                        acc.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
                        (!disabled || (shares[acc.id] ?? 0 > 0))
                )
                .sort(
                    createComparator(
                        lambdaComparator((acc) => shares[acc.id] ?? 0, true),
                        lambdaComparator((acc) => acc.name.toLowerCase())
                    )
                )
        );
    }, [disabled, shares, accounts, searchTerm]);

    useEffect(() => {
        setShares(value);
    }, [value, setShares]);

    return (
        <View>
            <Searchbar placeholder="Search" onChangeText={setSearchTerm} value={searchTerm} />
            <ScrollView>
                {filteredAccounts.map((account) => (
                    <List.Item
                        key={account.id}
                        title={account.name}
                        right={(props) => (
                            <Checkbox.Android
                                status={
                                    shares.hasOwnProperty(account.id) && shares[account.id] > 0
                                        ? "checked"
                                        : "unchecked"
                                }
                                onPress={() => !disabled && toggleShare(account.id)}
                                disabled={disabled}
                            />
                        )}
                    />
                ))}
            </ScrollView>
        </View>
    );
};

export default ShareSelect;
