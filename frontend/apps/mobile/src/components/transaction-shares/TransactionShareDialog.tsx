import { selectSortedAccounts } from "@abrechnung/redux";
import { TransactionShare } from "@abrechnung/types";
import memoize from "proxy-memoize";
import * as React from "react";
import { useState } from "react";
import { ScrollView } from "react-native";
import { Button, Checkbox, Dialog, List, Searchbar } from "react-native-paper";
import { getAccountIcon } from "../../constants/Icons";
import { RootState, selectAccountSlice, useAppSelector } from "../../store";
import { KeyboardAvoidingDialog } from "../style/KeyboardAvoidingDialog";

interface Props {
    groupId: number;
    value: TransactionShare;
    onChange?: (share: TransactionShare) => void;
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
    multiSelect = true,
    excludedAccounts = [],
}) => {
    const [searchTerm, setSearchTerm] = useState("");
    const selector = React.useCallback(
        memoize((state: RootState) => {
            const sorted = selectSortedAccounts({
                state: selectAccountSlice(state),
                groupId,
                sortMode: "name",
                searchTerm,
            });
            if (disabled) {
                return sorted.filter((acc) => (value[acc.id] ?? 0) > 0 && !excludedAccounts.includes(acc.id));
            }
            return sorted.filter((acc) => !excludedAccounts.includes(acc.id));
        }),
        [groupId, searchTerm, disabled, value, excludedAccounts]
    );
    const accounts = useAppSelector(selector);

    const toggleShare = (account_id: number) => {
        if (!onChange) {
            return;
        }
        const currVal = value[account_id] !== undefined ? value[account_id] : 0;
        if (multiSelect) {
            const newShares = { ...value };
            if (currVal > 0) {
                delete newShares[account_id];
            } else {
                newShares[account_id] = 1;
            }
            onChange(newShares);
        } else {
            onChange(currVal > 0 ? {} : { [account_id]: 1 });
        }
    };

    const finishDialog = () => {
        onHideDialog();
    };

    return (
        <KeyboardAvoidingDialog visible={showDialog} onDismiss={finishDialog}>
            <Dialog.Title>{title}</Dialog.Title>

            {accounts.length > 5 && (
                <Dialog.Content>
                    <Searchbar placeholder="Search" onChangeText={setSearchTerm} value={searchTerm} />
                </Dialog.Content>
            )}

            <Dialog.ScrollArea>
                <ScrollView>
                    {accounts.map((account) => (
                        <List.Item
                            key={account.id}
                            title={account.name}
                            onPress={() => !disabled && toggleShare(account.id)}
                            left={(props) => <List.Icon {...props} icon={getAccountIcon(account.type)} />}
                            right={() => (
                                <Checkbox.Android
                                    status={
                                        value[account.id] !== undefined && value[account.id] > 0
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
