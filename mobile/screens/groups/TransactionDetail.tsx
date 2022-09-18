import { GroupStackParamList } from "../../types";
import { BackHandler, ScrollView, StyleSheet, View } from "react-native";
import * as React from "react";
import { useEffect, useLayoutEffect, useState } from "react";
import {
    ActivityIndicator,
    Button,
    Divider,
    HelperText,
    List,
    Surface,
    Text,
    TextInput,
    useTheme,
} from "react-native-paper";
import TransactionShareInput from "../../components/transaction_shares/TransactionShareInput";
import {
    createPosition,
    deleteLocalTransactionChanges,
    pushLocalTransactionChanges,
    updateTransaction,
} from "../../core/database/transactions";
import DateTimeInput from "../../components/DateTimeInput";
import { useRecoilValue, useRecoilValueLoadable } from "recoil";
import { positionStateByTransaction, transactionByIDState } from "../../core/transactions";
import PositionListItem from "../../components/PositionListItem";
import { notify } from "../../notifications";
import { toISOString } from "../../core/utils";
import { StackScreenProps } from "@react-navigation/stack";
import LoadingIndicator from "../../components/LoadingIndicator";
import { useFocusEffect } from "@react-navigation/native";
import { validateTransaction, ValidationError } from "../../core/types";

export default function TransactionDetail({
                                              route,
                                              navigation,
                                          }: StackScreenProps<GroupStackParamList, "TransactionDetail">) {
    const theme = useTheme();
    const { groupID, transactionID, editingStart } = route.params;

    const editing = editingStart !== null;

    const transaction = useRecoilValue(transactionByIDState({ groupID, transactionID }));
    const positions = useRecoilValueLoadable(positionStateByTransaction(transactionID));
    const [localEditingState, setLocalEditingState] = useState(null);
    const [inputErrors, setInputErrors] = useState({});

    useLayoutEffect(() => {
        navigation.setOptions({
            onGoBack: onGoBack,
            headerTitle: localEditingState?.description ?? transaction?.description ?? "",
            headerRight: () => {
                if (editing) {
                    return (
                        <>
                            <Button onPress={cancelEdit} textColor={theme.colors.error}>Cancel</Button>
                            <Button onPress={save}>Save</Button>
                        </>
                    );
                }
                return (
                    <Button onPress={edit}>Edit</Button>
                );
            }

            ,
        });
    }, [theme, editing, navigation, localEditingState, setLocalEditingState]); // FIXME: figure out why we need localEditingState as an effect dependency

    const onGoBack = async () => {
        if (editing && transaction != null) {
            return await deleteLocalTransactionChanges(groupID, transaction.id, editingStart);
        }
        return;
    };

    useFocusEffect(
        React.useCallback(() => {
            const onBackPress = () => {
                onGoBack().catch(err => {
                    notify({ text: `Error while going back: ${err.toString()}` });
                });
                return false;
            };

            BackHandler.addEventListener("hardwareBackPress", onBackPress);

            return () =>
                BackHandler.removeEventListener("hardwareBackPress", onBackPress);
        }, [editing, transaction]),
    );

    useEffect(() => {
        if (transaction != null) {
            setInputErrors({});
            setLocalEditingState(prevState => {
                return {
                    ...prevState,
                    description: transaction.description,
                    value: transaction.value,
                    billed_at: transaction.billed_at,
                    currency_symbol: transaction.currency_symbol,
                    currency_conversion_rate: transaction.currency_conversion_rate,
                    creditor_shares: transaction.creditor_shares,
                    debitor_shares: transaction.debitor_shares,
                };
            });
        }
    }, [transaction]);

    const save = () => {
        updateTransaction({
            ...transaction,
            ...localEditingState,
            value: parseFloat(localEditingState.value),
            currency_conversion_rate: parseFloat(localEditingState.currency_conversion_rate),
        })
            .then(() => {
                setInputErrors({});
                console.log("saved transaction changes to local db");
                pushLocalTransactionChanges(transaction.id)
                    .then(res => {
                        const [updatedTransaction, updatedPositions] = res;
                        console.log("synced updated transaction with server: old id", transaction.id, "new id", updatedTransaction.id, "group", groupID);
                        navigation.navigate("TransactionDetail", {
                            transactionID: updatedTransaction.id,
                            groupID: groupID,
                            editingStart: null,
                        });
                    })
                    .catch(err => {
                        console.log("error on pushing stuff to server", err);
                        navigation.navigate("TransactionDetail", {
                            transactionID: transaction.id,
                            groupID: groupID,
                            editingStart: null,
                        });
                    });
            })
            .catch(err => {
                if (err instanceof ValidationError) {
                    setInputErrors(err.data);
                } else {
                    console.log("error saving transaction details to local state:", err);
                    notify({ text: `Error while saving transaction: ${err.toString()}` });
                }
            });
    };

    const edit = () => {
        navigation.navigate("TransactionDetail", {
            transactionID: transactionID,
            groupID: groupID,
            editingStart: toISOString(new Date()),
        });
    };

    const cancelEdit = () => {
        deleteLocalTransactionChanges(groupID, transaction.id, editingStart).then(deletedTransaction => {
            if (deletedTransaction) {
                navigation.navigate("BottomTabNavigator", { screen: "TransactionList" });
            } else {
                setLocalEditingState({
                    description: transaction.description,
                    value: transaction.value,
                    billed_at: transaction.billed_at,
                    currency_symbol: transaction.currency_symbol,
                    currency_conversion_rate: transaction.currency_conversion_rate,
                    creditor_shares: transaction.creditor_shares,
                    debitor_shares: transaction.debitor_shares,
                });
                navigation.navigate("TransactionDetail", {
                    transactionID: transactionID,
                    groupID: groupID,
                    editingStart: null,
                });
            }
        });
    };

    const onCreatePosition = () => {
        createPosition(groupID, transaction.id)
            .catch(err => {
                notify({ text: `Error while creating position: ${err.toString()}` });
            });
    };

    const onChangeLocalEditingValueFactory = (fieldName: string) => (value) => {
        setInputErrors({});
        setLocalEditingState(prevState => {
            return {
                ...prevState,
                [fieldName]: value,
            };
        });
    };

    if (transaction == null || localEditingState == null) {
        return (
            <View>
                <ActivityIndicator animating={true} />
            </View>
        );
    }

    const inputStyles = editing ? styles.input : {
        marginBottom: 4,
        // color: theme.colors.onBackground,
        backgroundColor: theme.colors.background,
    };

    return (
        <ScrollView
            style={styles.container}
        >
            <TextInput
                label="Description"
                value={localEditingState.description}
                editable={editing}
                // disabled={!editing}
                onChangeText={onChangeLocalEditingValueFactory("description")}
                style={inputStyles}
                error={inputErrors.hasOwnProperty("description")}
            />
            {inputErrors.hasOwnProperty("description") && (
                <HelperText type="error">{inputErrors["description"]}</HelperText>
            )}
            <DateTimeInput
                label="Billed At"
                value={localEditingState.billed_at}
                editable={editing}
                style={inputStyles}
                onChange={onChangeLocalEditingValueFactory("billed_at")}
                error={inputErrors.hasOwnProperty("billed_at")}
            />
            {inputErrors.hasOwnProperty("billed_at") && (
                <HelperText type="error">{inputErrors["billed_at"]}</HelperText>
            )}
            <TextInput
                label="Value" // TODO: proper float input
                value={editing ? String(localEditingState.value) : String(localEditingState.value.toFixed(2))}
                editable={editing}
                keyboardType="numeric"
                onChangeText={onChangeLocalEditingValueFactory("value")}
                style={inputStyles}
                right={<TextInput.Affix text={transaction.currency_symbol} />}
                error={inputErrors.hasOwnProperty("value")}
            />
            {inputErrors.hasOwnProperty("value") && (
                <HelperText type="error">{inputErrors["value"]}</HelperText>
            )}

            <TransactionShareInput
                title="Paid by"
                groupID={groupID}
                disabled={!editing}
                value={localEditingState.creditor_shares}
                onChange={onChangeLocalEditingValueFactory("creditor_shares")}
                enableAdvanced={false}
                multiSelect={false}
            />
            {inputErrors.hasOwnProperty("creditor_shares") && (
                <HelperText type="error">{inputErrors["creditor_shares"]}</HelperText>
            )}
            <TransactionShareInput
                title="For"
                disabled={!editing}
                groupID={groupID}
                value={localEditingState.debitor_shares}
                onChange={onChangeLocalEditingValueFactory("debitor_shares")}
                enableAdvanced={transaction.type === "purchase"}
                multiSelect={transaction.type === "purchase"}
            />
            {inputErrors.hasOwnProperty("debitor_shares") && (
                <HelperText type="error">{inputErrors["debitor_shares"]}</HelperText>
            )}

            {positions.state === "loading" ? (
                <LoadingIndicator />
            ) : positions.contents.length > 0 && (
                <Surface style={{ marginTop: 8 }} elevation={1}>
                    <List.Item title="Postions" />
                    <>
                        <Divider />
                        {positions.contents.map(position => (
                            <PositionListItem
                                key={position.id}
                                currency_symbol={transaction.currency_symbol}
                                position={position}
                                editing={editing}
                            />
                        ))}
                        <Divider />
                        <List.Item
                            title="Total"
                            right={props =>
                                <Text>{positions.contents.map(p => p.price).reduce((acc, curr) => acc + curr, 0).toFixed(2)} {transaction.currency_symbol}</Text>}
                        />
                    </>
                </Surface>
            )}
            {transaction.type === "purchase" && editing && (
                <Button icon="add" onPress={onCreatePosition}>Add Position</Button>
            )}

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 6,
    },
    input: {
        marginBottom: 4,
    },
    shareContainer: {
        padding: 16,
        borderBottomStyle: "solid",
        borderBottomColor: "#bebebe",
        borderBottomWidth: 1,
        borderTopRightRadius: 4,
        borderTopLeftRadius: 4,
        backgroundColor: "#1e1e1e",
    },
});
