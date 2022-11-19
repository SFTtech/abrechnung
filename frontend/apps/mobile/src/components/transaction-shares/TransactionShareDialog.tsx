import { Button, Checkbox, Dialog, List, Searchbar } from "react-native-paper";
import * as React from "react";
import { useEffect, useState } from "react";
import { createComparator, lambdaComparator } from "@abrechnung/utils";
import { getAccountIcon } from "../../constants/Icons";
import { ScrollView } from "react-native";
import { Account, TransactionShare } from "@abrechnung/types";
import { useAppSelector, selectAccountSlice } from "../../store";
import { selectGroupAccounts, selectSortedAccounts } from "@abrechnung/redux";
import { KeyboardAvoidingDialog } from "../style/KeyboardAvoidingDialog";

interface Props {
    groupId: number;
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
    groupId,
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
    const accounts = useAppSelector((state) => {
        const sorted = selectSortedAccounts({
            state: selectAccountSlice(state),
            groupId,
            sortMode: "name",
            searchTerm,
        });
        if (disabled) {
            return sorted.filter((acc) => (shares[acc.id] ?? 0) > 0 && !excludedAccounts.includes(acc.id));
        }
        return sorted.filter((acc) => !excludedAccounts.includes(acc.id));
    });

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
        setShares(value);
    }, [value, setShares]);

    const finishDialog = () => {
        if (!disabled) {
            onChange(shares);
        }
        onHideDialog();
    };

    return (
        <KeyboardAvoidingDialog visible={showDialog} onDismiss={finishDialog}>
            <Dialog.Title>{title}</Dialog.Title>

            <Dialog.Content>
                <Searchbar placeholder="Search" onChangeText={setSearchTerm} value={searchTerm} />
            </Dialog.Content>

            <Dialog.ScrollArea>
                <ScrollView>
                    {accounts.map((account) => (
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
        </KeyboardAvoidingDialog>
    );
};

export default TransactionShareDialog;
