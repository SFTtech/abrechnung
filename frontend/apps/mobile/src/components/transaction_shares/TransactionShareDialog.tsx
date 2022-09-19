import { Button, Checkbox, Dialog, List, Searchbar } from "react-native-paper";
import * as React from "react";
import { useEffect, useState } from "react";
import { useRecoilValue } from "recoil";
import { accountState } from "../../core/accounts";
import { createComparator, lambdaComparator } from "../../core/utils";
import { getAccountIcon } from "../../constants/Icons";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { TransactionShare } from "@abrechnung/types";

type Props = {
    groupID: number,
    value: TransactionShare,
    onChange: (TransactionShare) => void,
    showDialog: boolean,
    onHideDialog: () => void,
    title: string,
    disabled: boolean,
    enableAdvanced: boolean,
    multiSelect: boolean,
    excludedAccounts: number[]
}

export default function TransactionShareDialog({
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
                                               }: Props) {
    const [shares, setShares] = useState({});
    const [searchTerm, setSearchTerm] = useState("");
    const accounts = useRecoilValue(accountState(groupID));
    const [sortedAccounts, setSortedAccounts] = useState([]);
    const [filteredAccounts, setFilteredAccounts] = useState([]);

    const toggleShare = (account_id: number) => {
        const currVal = shares.hasOwnProperty(account_id) ? shares[account_id] : 0;
        if (multiSelect) {
            setShares(shares => {
                let newShares = { ...shares };
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
                .filter(acc => excludedAccounts.indexOf(acc.id) === -1)
                .filter(acc => acc.name.toLowerCase().includes(searchTerm.toLowerCase()) && (!disabled || (shares[acc.id] ?? 0 > 0))),
        );
    }, [disabled, shares, sortedAccounts, searchTerm, excludedAccounts]);

    useEffect(() => {
        setShares(value);
    }, [value, setShares]);

    useEffect(() => {
        if (showDialog) {
            // we transition from a closed to an open dialog - fix sorting of shares
            setSortedAccounts(
                [...accounts].sort(createComparator(
                    lambdaComparator(acc => shares[acc.id] ?? 0, true),
                    lambdaComparator(acc => acc.name.toLowerCase())),
                ),
            );
        }
    }, [accounts, showDialog]);

    const finishDialog = () => {
        onChange(shares);
        onHideDialog();
    };

    return (
        <Dialog visible={showDialog} onDismiss={finishDialog}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <Dialog.Title>{title}</Dialog.Title>

                <Dialog.Content>
                    <Searchbar
                        placeholder="Search"
                        onChangeText={setSearchTerm}
                        value={searchTerm}
                    />
                </Dialog.Content>

                <Dialog.ScrollArea>
                    <ScrollView>
                        {filteredAccounts.map(account => (
                            <List.Item
                                key={account.id}
                                title={account.name}
                                onPress={() => !disabled && toggleShare(account.id)}
                                left={props => <List.Icon {...props}
                                                          icon={getAccountIcon(account.type)} />}
                                right={props => <Checkbox.Android
                                    status={shares.hasOwnProperty(account.id) && shares[account.id] > 0 ? "checked" : "unchecked"}
                                    disabled={disabled} />
                                }
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
}
