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
import * as React from "react";
import { useEffect, useState } from "react";
import { useRecoilValue } from "recoil";
import { accountState } from "../core/accounts";
import { createComparator, lambdaComparator } from "@abrechnung/utils";
import { activeGroupIDState } from "../core/groups";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { updatePosition } from "../core/database/transactions";
import { notify } from "../notifications";
import { ValidationError } from "@abrechnung/types";

export default function PositionDialog({ position, editing, showDialog, onHideDialog, currencySymbol }) {
    const theme = useTheme();
    const groupID = useRecoilValue(activeGroupIDState);

    const [localEditingState, setLocalEditingState] = useState(null);

    const [searchTerm, setSearchTerm] = useState("");
    const accounts = useRecoilValue(accountState(groupID));
    const [sortedAccounts, setSortedAccounts] = useState([]);
    const [filteredAccounts, setFilteredAccounts] = useState([]);
    const [errors, setErrors] = useState({});

    const toggleShare = (account_id: number) => {
        const currVal = localEditingState.usages.hasOwnProperty(account_id) ? localEditingState.usages[account_id] : 0;
        setLocalEditingState((prevState) => {
            let newShares = { ...prevState.usages };
            if (currVal > 0) {
                delete newShares[account_id];
            } else {
                newShares[account_id] = 1;
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
    }, [accounts, showDialog]);

    const resetLocalState = () => {
        if (position != null) {
            setLocalEditingState({
                name: position.name,
                price: position.price,
                communist_shares: position.communist_shares,
                usages: position.usages,
            });
        }
        setErrors({});
    };

    useEffect(() => {
        resetLocalState();
    }, [position, setLocalEditingState]);

    const finishDialog = () => {
        console.log(position);
        updatePosition({
            ...position,
            ...localEditingState,
            communist_shares: parseFloat(localEditingState.communist_shares),
            price: parseFloat(localEditingState.price),
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

    const onChangeLocalEditingValueFactory = (fieldName: string) => (value) => {
        setLocalEditingState((prevState) => {
            return {
                ...prevState,
                [fieldName]: value,
            };
        });
    };

    const toggleCommunistShare = () => {
        if (editing) {
            setLocalEditingState((prevState) => {
                return {
                    ...prevState,
                    communist_shares: prevState.communist_shares > 0 ? 0 : 1,
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
                                onChangeText={onChangeLocalEditingValueFactory("name")}
                                style={inputStyles}
                                error={errors.hasOwnProperty("name")}
                            />
                            {errors.hasOwnProperty("name") && <HelperText type="error">{errors["name"]}</HelperText>}
                            <TextInput
                                label="Price" // TODO: proper float input
                                value={
                                    editing
                                        ? String(localEditingState.price)
                                        : String(localEditingState.price.toFixed(2))
                                }
                                editable={editing}
                                keyboardType="numeric"
                                onChangeText={onChangeLocalEditingValueFactory("price")}
                                style={inputStyles}
                                right={<TextInput.Affix text={currencySymbol} />}
                                error={errors.hasOwnProperty("price")}
                            />
                            {errors.hasOwnProperty("price") && <HelperText type="error">{errors["price"]}</HelperText>}

                            <List.Item
                                title="Communist Shares"
                                right={(props) => (
                                    <Checkbox.Android
                                        status={localEditingState.communist_shares > 0 ? "checked" : "unchecked"}
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
                                                    localEditingState.usages.hasOwnProperty(account.id) &&
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
}

const styles = StyleSheet.create({
    input: {
        marginBottom: 4,
    },
});
