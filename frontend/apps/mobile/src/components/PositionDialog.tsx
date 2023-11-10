import { selectSortedAccounts, wipPositionUpdated } from "@abrechnung/redux";
import { PositionValidationErrors, TransactionPosition, ValidationError, validatePosition } from "@abrechnung/types";
import memoize from "proxy-memoize";
import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
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
import { notify } from "../notifications";
import { RootState, selectAccountSlice, useAppDispatch, useAppSelector } from "../store";
import { NumericInput } from "./NumericInput";
import { KeyboardAvoidingDialog } from "./style/KeyboardAvoidingDialog";

interface Props {
    groupId: number;
    position: TransactionPosition;
    editing: boolean;
    showDialog: boolean;
    currency_symbol: string;
    onHideDialog: () => void;
}

interface localEditingState {
    name: string;
    price: number;
    usages: { [k: number]: number };
    communist_shares: number;
}

const initialEditingState: localEditingState = {
    name: "",
    price: 0,
    usages: {},
    communist_shares: 0,
};

export const PositionDialog: React.FC<Props> = ({
    groupId,
    position,
    editing,
    showDialog,
    onHideDialog,
    currency_symbol,
}) => {
    const dispatch = useAppDispatch();
    const theme = useTheme();

    const [localEditingState, setLocalEditingState] = useState<localEditingState>(initialEditingState);
    const [searchTerm, setSearchTerm] = useState("");
    const selector = React.useCallback(
        memoize((state: RootState) => {
            const sorted = selectSortedAccounts({
                state: selectAccountSlice(state),
                groupId,
                sortMode: "name",
                searchTerm,
            });
            if (!editing) {
                return sorted.filter((acc) => (localEditingState.usages[acc.id] ?? 0) > 0);
            }
            return sorted;
        }),
        [groupId, searchTerm, editing, localEditingState]
    );
    const accounts = useAppSelector(selector);
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

    const resetLocalState = useCallback(() => {
        if (position != null) {
            setLocalEditingState({
                name: position.name,
                price: position.price,
                communist_shares: position.communist_shares,
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

        const newPosition: TransactionPosition = {
            ...position,
            ...localEditingState,
            communist_shares: localEditingState.communist_shares,
            price: localEditingState.price,
        };
        // TODO: perform input validation
        try {
            validatePosition(newPosition);
            dispatch(wipPositionUpdated({ groupId, transactionId: position.transactionID, position: newPosition }));
            setErrors({});
            onHideDialog();
        } catch (err) {
            if (err instanceof ValidationError) {
                setErrors(err.data);
            } else {
                notify({ text: `Error while saving position: ${(err as Error).toString()}` });
            }
        }
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

    const onChangePrice = (value: number) => {
        setLocalEditingState((prevState) => {
            return {
                ...prevState,
                price: value,
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
        <KeyboardAvoidingDialog visible={showDialog} onDismiss={onHideDialog}>
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
                        <NumericInput
                            label="Price" // TODO: proper float input
                            value={localEditingState.price}
                            editable={editing}
                            keyboardType="numeric"
                            onChange={onChangePrice}
                            style={inputStyles}
                            right={<TextInput.Affix text={currency_symbol} />}
                            error={errors.price !== undefined}
                        />
                        {errors.price !== undefined && <HelperText type="error">{errors.price}</HelperText>}

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

                        {editing && <Searchbar placeholder="Search" onChangeText={setSearchTerm} value={searchTerm} />}
                    </Dialog.Content>

                    <Dialog.ScrollArea>
                        <ScrollView>
                            {accounts.map((account) => (
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
        </KeyboardAvoidingDialog>
    );
};

const styles = StyleSheet.create({
    input: {
        marginBottom: 4,
    },
});

export default PositionDialog;
