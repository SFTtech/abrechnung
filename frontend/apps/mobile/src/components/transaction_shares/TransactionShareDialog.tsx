import { Button, Checkbox, Dialog, List, Searchbar } from "react-native-paper";
import * as React from "react";
import { useEffect, useState } from "react";
import { useRecoilValue } from "recoil";
import { accountState } from "../../core/accounts";
import { createComparator, lambdaComparator } from "@abrechnung/utils";
import { getAccountIcon } from "../../constants/Icons";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Account, TransactionShare } from "@abrechnung/types";

interface Props {
    groupID: number;
    value: TransactionShare;
    onChange: (share: TransactionShare) => void;
    showDialog: boolean;
    onHideDialog: () => void;
    title: string;
    disabled: boolean;
    enableAdvanced: boolean;
    multiSelect: boolean;
    excludedAccounts: number[];
}

export const TransactionShareDialog: React.FC<Props> = ({
    groupID,
    value,
    onChange,
    showDialog,
    onHideDialog,
    title,
    disabled = false,
    enableAdvanced = false,
    multiSelect = true,
    excludedAccounts = [],
}) => {
    const [shares, setShares] = useState<TransactionShare>({});
    const [searchTerm, setSearchTerm] = useState("");
    const accounts = useRecoilValue(accountState(groupID));
    const [sortedAccounts, setSortedAccounts] = useState<Account[]>([]);
    const [filteredAccounts, setFilteredAccounts] = useState<Account[]>([]);

    const toggleShare = (account_id: number) => {
        const currVal = shares[account_id] !== undefined ? shares[account_id] : 0;
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
            sortedAccounts
                .filter((acc) => excludedAccounts.indexOf(acc.id) === -1)
                .filter(
                    (acc) =>
                        acc.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
                        (!disabled || (shares[acc.id] ?? 0) > 0)
                )
        );
    }, [disabled, shares, sortedAccounts, searchTerm, excludedAccounts]);

    useEffect(() => {
        setShares(value);
    }, [value, setShares]);

    useEffect(() => {
        if (showDialog) {
            // we transition from a closed to an open dialog - fix sorting of shares
            setSortedAccounts(
                [...accounts].sort(
                    createComparator(
                        lambdaComparator((acc) => shares[acc.id] ?? 0, true),
                        lambdaComparator((acc) => acc.name.toLowerCase())
                    )
                )
            );
        }
    }, [accounts, showDialog, shares]);

    const finishDialog = () => {
        onChange(shares);
        onHideDialog();
    };

    return (
        <Dialog visible={showDialog} onDismiss={finishDialog}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
                <Dialog.Title>{title}</Dialog.Title>

                <Dialog.Content>
                    <Searchbar placeholder="Search" onChangeText={setSearchTerm} value={searchTerm} />
                </Dialog.Content>

                <Dialog.ScrollArea>
                    <ScrollView>
                        {filteredAccounts.map((account) => (
                            <List.Item
                                key={account.id}
                                title={account.name}
                                onPress={() => !disabled && toggleShare(account.id)}
                                left={(props) => <List.Icon {...props} icon={getAccountIcon(account.type)} />}
                                right={(props) => (
                                    <Checkbox.Android
                                        status={
                                            shares[account.id] !== undefined && shares[account.id] > 0
                                                ? "checked"
                                                : "unchecked"
                                        }
                                        disabled={disabled}
                                    />
                                )}
                            />
                        ))}
                    </ScrollView>
                </Dialog.ScrollArea>

                <Dialog.Actions>
                    <Button onPress={finishDialog}>Done</Button>
                </Dialog.Actions>
            </KeyboardAvoidingView>
        </Dialog>
    );
};

export default TransactionShareDialog;
