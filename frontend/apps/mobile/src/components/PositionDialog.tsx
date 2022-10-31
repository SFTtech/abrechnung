import {
    ActivityIndicator,
    Button,
    Checkbox,
    Dialog,
    HelperText,
    List,
    Searchbar,
    Text,
    TextInput,
    useTheme,
} from "react-native-paper";
import React, { useEffect, useState, useCallback } from "react";
import { useRecoilValue } from "recoil";
import { accountState } from "../core/accounts";
import { createComparator, lambdaComparator } from "@abrechnung/utils";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { updatePosition } from "../core/database/transactions";
import { notify } from "../notifications";
import { Account, PositionValidationErrors, TransactionPosition, ValidationError } from "@abrechnung/types";
import { Value } from "react-native-reanimated";

interface Props {
    groupID: number;
    position: TransactionPosition;
    editing: boolean;
    showDialog: boolean;
    currencySymbol: string;
    onHideDialog: () => void;
}

interface localEditingState {
    name: string;
    price: number;
    usages: { [k: number]: number };
    communistShares: number;
}

const initialEditingState: localEditingState = {
    name: "",
    price: 0,
    usages: {},
    communistShares: 0,
};

export const PositionDialog: React.FC<Props> = ({
    groupID,
    position,
    editing,
    showDialog,
    onHideDialog,
    currencySymbol,
}) => {
    const theme = useTheme();

    const [localEditingState, setLocalEditingState] = useState<localEditingState>(initialEditingState);

    const [searchTerm, setSearchTerm] = useState("");
    const accounts = useRecoilValue(accountState(groupID));
    const [sortedAccounts, setSortedAccounts] = useState<Account[]>([]);
    const [filteredAccounts, setFilteredAccounts] = useState<Account[]>([]);
    const [errors, setErrors] = useState<PositionValidationErrors>({});

    const toggleShare = (accountID: number) => {
        const currVal = localEditingState.usages[accountID] !== undefined ? localEditingState.usages[accountID] : 0;
        setLocalEditingState((prevState) => {
            const newShares = { ...prevState.usages };
            if (currVal > 0) {
                delete newShares[accountID];
            } else {
                newShares[accountID] = 1;
            }
            return {
                ...prevState,
                usages: newShares,
            };
        });
    };

    useEffect(() => {
        if (localEditingState != null) {
            setFilteredAccounts(
                sortedAccounts.filter(
                    (acc) =>
                        acc.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
                        (editing || (localEditingState.usages[acc.id] ?? 0 > 0))
                )
            );
        }
    }, [editing, localEditingState, sortedAccounts, searchTerm]);

    useEffect(() => {
        if (showDialog) {
            // we transition from a closed to an open dialog - fix sorting of shares
            setSortedAccounts(
                [...accounts].sort(
                    createComparator(
                        lambdaComparator((acc) => localEditingState.usages[acc.id] ?? 0, true),
                        lambdaComparator((acc) => acc.name.toLowerCase())
                    )
                )
            );
        }
    }, [accounts, showDialog, localEditingState]);

    const resetLocalState = useCallback(() => {
        if (position != null) {
            setLocalEditingState({
                name: position.name,
                price: position.price,
                communistShares: position.communistShares,
                usages: position.usages,
            });
        }
        setErrors({});
    }, [position, setLocalEditingState, setErrors]);

    useEffect(() => {
        resetLocalState();
    }, [resetLocalState]);

    const finishDialog = () => {
        if (!editing) {
            onHideDialog();
            return;
        }

        console.log(position);
        updatePosition({
            ...position,
            ...localEditingState,
            communistShares: localEditingState.communistShares,
            price: localEditingState.price,
        })
            .then(() => {
                setErrors({});
                onHideDialog();
            })
            .catch((err) => {
                if (err instanceof ValidationError) {
                    setErrors(err.data);
                } else {
                    notify({ text: `Error while saving position: ${err.toString()}` });
                }
            });
    };

    const cancelDialog = () => {
        resetLocalState();
        onHideDialog();
    };

    const onChangeName = (value: string) => {
        setLocalEditingState((prevState) => {
            return {
                ...prevState,
                name: value,
            };
        });
    };

    const onChangePrice = (value: string) => {
        setLocalEditingState((prevState) => {
            return {
                ...prevState,
                price: parseFloat(value),
            };
        });
    };

    const toggleCommunistShare = () => {
        if (editing) {
            setLocalEditingState((prevState) => {
                return {
                    ...prevState,
                    communistShares: prevState.communistShares > 0 ? 0 : 1,
                };
            });
        }
    };

    const inputStyles = editing
        ? styles.input
        : {
              marginBottom: 4,
              // color: theme.colors.onBackground,
              backgroundColor: theme.colors.background,
          };

    return (
        <Dialog visible={showDialog} onDismiss={onHideDialog}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
                {position == null || localEditingState == null ? (
                    <Dialog.Content>
                        <ActivityIndicator animating={true} />
                    </Dialog.Content>
                ) : (
                    <>
                        <Dialog.Title>
                            <Text>Position</Text>
                        </Dialog.Title>
                        <Dialog.Content>
                            <TextInput
                                label="Name"
                                value={localEditingState.name}
                                editable={editing}
                                onChangeText={onChangeName}
                                style={inputStyles}
                                error={errors.name !== undefined}
                            />
                            {errors.name !== undefined && <HelperText type="error">{errors.name}</HelperText>}
                            <TextInput
                                label="Price" // TODO: proper float input
                                value={
                                    editing
                                        ? String(localEditingState.price)
                                        : String(localEditingState.price.toFixed(2))
                                }
                                editable={editing}
                                keyboardType="numeric"
                                onChangeText={onChangePrice}
                                style={inputStyles}
                                right={<TextInput.Affix text={currencySymbol} />}
                                error={errors.price !== undefined}
                            />
                            {errors.price !== undefined && <HelperText type="error">{errors.price}</HelperText>}

                            <List.Item
                                title="Communist Shares"
                                right={(props) => (
                                    <Checkbox.Android
                                        status={localEditingState.communistShares > 0 ? "checked" : "unchecked"}
                                        disabled={!editing}
                                    />
                                )}
                                onPress={toggleCommunistShare}
                            />

                            {editing && (
                                <Searchbar placeholder="Search" onChangeText={setSearchTerm} value={searchTerm} />
                            )}
                        </Dialog.Content>

                        <Dialog.ScrollArea>
                            <ScrollView>
                                {filteredAccounts.map((account) => (
                                    <List.Item
                                        key={account.id}
                                        title={account.name}
                                        onPress={() => editing && toggleShare(account.id)}
                                        disabled={!editing}
                                        right={(props) => (
                                            <Checkbox.Android
                                                status={
                                                    localEditingState.usages[account.id] !== undefined &&
                                                    localEditingState.usages[account.id] > 0
                                                        ? "checked"
                                                        : "unchecked"
                                                }
                                                disabled={!editing}
                                            />
                                        )}
                                    />
                                ))}
                            </ScrollView>
                        </Dialog.ScrollArea>

                        <Dialog.Actions>
                            {editing && (
                                <Button onPress={cancelDialog} textColor={theme.colors.error}>
                                    Cancel
                                </Button>
                            )}
                            <Button onPress={finishDialog}>Done</Button>
                        </Dialog.Actions>
                    </>
                )}
            </KeyboardAvoidingView>
        </Dialog>
    );
};

const styles = StyleSheet.create({
    input: {
        marginBottom: 4,
    },
});

export default PositionDialog;
