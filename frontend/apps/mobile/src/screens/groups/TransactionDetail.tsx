import { GroupStackParamList, GroupStackScreenProps } from "../../navigation/types";
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
import { useRecoilValueLoadable } from "recoil";
import { positionStateByTransaction, useTransaction } from "../../core/transactions";
import PositionListItem from "../../components/PositionListItem";
import { notify } from "../../notifications";
import { StackScreenProps } from "@react-navigation/stack";
import LoadingIndicator from "../../components/LoadingIndicator";
import { useFocusEffect } from "@react-navigation/native";
import {
    TransactionDetails,
    TransactionPosition,
    TransactionShare,
    TransactionValidationErrors,
    ValidationError,
} from "@abrechnung/types";

type LocalEditingState = Pick<
    TransactionDetails,
    | "description"
    | "value"
    | "billedAt"
    | "currencySymbol"
    | "currencyConversionRate"
    | "creditorShares"
    | "debitorShares"
>;

export const TransactionDetail: React.FC<GroupStackScreenProps<"TransactionDetail">> = ({ route, navigation }) => {
    const theme = useTheme();
    const { groupID, transactionID, editingStart } = route.params;

    const editing = editingStart !== null;

    const transaction = useTransaction(groupID, transactionID);
    const positions = useRecoilValueLoadable(positionStateByTransaction(transactionID));
    const [localEditingState, setLocalEditingState] = useState<LocalEditingState | null>(null);
    const [inputErrors, setInputErrors] = useState<TransactionValidationErrors>({});
    const onGoBack = React.useCallback(async () => {
        if (editing && transaction != null) {
            return await deleteLocalTransactionChanges(groupID, transaction.id, editingStart);
        }
        return;
    }, [editing, transaction, groupID, editingStart]);

    useFocusEffect(
        React.useCallback(() => {
            const onBackPress = () => {
                onGoBack().catch((err) => {
                    notify({ text: `Error while going back: ${err.toString()}` });
                });
                return false;
            };

            BackHandler.addEventListener("hardwareBackPress", onBackPress);

            return () => BackHandler.removeEventListener("hardwareBackPress", onBackPress);
        }, [onGoBack])
    );

    useEffect(() => {
        setInputErrors({});
        setLocalEditingState((prevState) => {
            return {
                ...prevState,
                description: transaction.description,
                value: transaction.value,
                billedAt: transaction.billedAt,
                currencySymbol: transaction.currencySymbol,
                currencyConversionRate: transaction.currencyConversionRate,
                creditorShares: transaction.creditorShares,
                debitorShares: transaction.debitorShares,
            };
        });
    }, [transaction]);

    const save = React.useCallback(() => {
        updateTransaction({
            ...transaction,
            ...localEditingState,
        })
            .then(() => {
                setInputErrors({});
                console.log("saved transaction changes to local db");
                pushLocalTransactionChanges(transaction.id)
                    .then((res) => {
                        const [updatedTransaction, updatedPositions] = res;
                        console.log(
                            "synced updated transaction with server: old id",
                            transaction.id,
                            "new id",
                            updatedTransaction.id,
                            "group",
                            groupID
                        );
                        navigation.navigate("TransactionDetail", {
                            transactionID: updatedTransaction.id,
                            groupID: groupID,
                            editingStart: null,
                        });
                    })
                    .catch((err) => {
                        console.log("error on pushing stuff to server", err);
                        navigation.navigate("TransactionDetail", {
                            transactionID: transaction.id,
                            groupID: groupID,
                            editingStart: null,
                        });
                    });
            })
            .catch((err) => {
                if (err instanceof ValidationError) {
                    setInputErrors(err.data);
                } else {
                    console.log("error saving transaction details to local state:", err);
                    notify({ text: `Error while saving transaction: ${err.toString()}` });
                }
            });
    }, [navigation, groupID, transaction, setInputErrors, localEditingState]);

    const edit = React.useCallback(() => {
        navigation.navigate("TransactionDetail", {
            transactionID: transactionID,
            groupID: groupID,
            editingStart: new Date().toISOString(),
        });
    }, [navigation, transactionID, groupID]);

    const cancelEdit = React.useCallback(() => {
        deleteLocalTransactionChanges(groupID, transaction.id, editingStart === null ? undefined : editingStart).then(
            (deletedTransaction) => {
                if (deletedTransaction) {
                    navigation.navigate("BottomTabNavigator", {
                        screen: "TransactionList",
                    });
                } else {
                    setLocalEditingState({
                        description: transaction.description,
                        value: transaction.value,
                        billedAt: transaction.billedAt,
                        currencySymbol: transaction.currencySymbol,
                        currencyConversionRate: transaction.currencyConversionRate,
                        creditorShares: transaction.creditorShares,
                        debitorShares: transaction.debitorShares,
                    });
                    navigation.navigate("TransactionDetail", {
                        transactionID: transactionID,
                        groupID: groupID,
                        editingStart: null,
                    });
                }
            }
        );
    }, [transaction, groupID, editingStart, navigation, transactionID]);

    useLayoutEffect(() => {
        navigation.setOptions({
            onGoBack: onGoBack,
            headerTitle: localEditingState?.description ?? transaction?.description ?? "",
            headerRight: () => {
                if (editing) {
                    return (
                        <>
                            <Button onPress={cancelEdit} textColor={theme.colors.error}>
                                Cancel
                            </Button>
                            <Button onPress={save}>Save</Button>
                        </>
                    );
                }
                return <Button onPress={edit}>Edit</Button>;
            },
        });
    }, [theme, editing, navigation, localEditingState, onGoBack, cancelEdit, save, edit, transaction]); // FIXME: figure out why we need localEditingState as an effect dependency

    const onCreatePosition = () => {
        createPosition(groupID, transaction.id).catch((err) => {
            notify({ text: `Error while creating position: ${err.toString()}` });
        });
    };

    const onChangeDescription = (description: string) =>
        setLocalEditingState((prevState) => {
            return prevState === null ? null : { ...prevState, description: description };
        });
    const onChangeValue = (value: string) =>
        setLocalEditingState((prevState) => {
            return prevState === null ? null : { ...prevState, value: parseFloat(value) };
        });
    const onChangedBilledAt = (billedAt: Date) =>
        setLocalEditingState((prevState) => {
            return prevState === null ? null : { ...prevState, billedAt: billedAt };
        });
    const onChangeCurrencySymbol = (currencySymbol: string) =>
        setLocalEditingState((prevState) => {
            return prevState === null ? null : { ...prevState, currencySymbol: currencySymbol };
        });
    const onChangeCurrencyConversionRate = (currencyConversionRate: string) =>
        setLocalEditingState((prevState) => {
            return prevState === null
                ? null
                : { ...prevState, currencyConversionRate: parseFloat(currencyConversionRate) };
        });
    const onChangeCreditorShares = (creditorShares: TransactionShare) =>
        setLocalEditingState((prevState) => {
            return prevState === null ? null : { ...prevState, creditorShares: creditorShares };
        });
    const onChangeDebitorSharesShares = (debitorShares: TransactionShare) =>
        setLocalEditingState((prevState) => {
            return prevState === null ? null : { ...prevState, debitorShares: debitorShares };
        });

    if (transaction == null || localEditingState == null) {
        return (
            <View>
                <ActivityIndicator animating={true} />
            </View>
        );
    }

    const inputStyles = editing
        ? styles.input
        : {
              marginBottom: 4,
              // color: theme.colors.onBackground,
              backgroundColor: theme.colors.background,
          };

    return (
        <ScrollView style={styles.container}>
            <TextInput
                label="Description"
                value={localEditingState.description}
                editable={editing}
                // disabled={!editing}
                onChangeText={onChangeDescription}
                style={inputStyles}
                error={inputErrors.description !== undefined}
            />
            {inputErrors.description && <HelperText type="error">{inputErrors.description}</HelperText>}
            <DateTimeInput
                label="Billed At"
                value={localEditingState.billedAt}
                editable={editing}
                style={inputStyles}
                onChange={onChangedBilledAt}
                error={inputErrors.billedAt !== undefined}
            />
            {inputErrors.billedAt && <HelperText type="error">{inputErrors.billedAt}</HelperText>}
            <TextInput
                label="Value" // TODO: proper float input
                value={editing ? String(localEditingState.value) : String(localEditingState.value.toFixed(2))}
                editable={editing}
                keyboardType="numeric"
                onChangeText={onChangeValue}
                style={inputStyles}
                right={<TextInput.Affix text={transaction.currencySymbol} />}
                error={inputErrors.value !== undefined}
            />
            {inputErrors.value && <HelperText type="error">{inputErrors.value}</HelperText>}

            <TransactionShareInput
                title="Paid by"
                groupID={groupID}
                disabled={!editing}
                value={localEditingState.creditorShares}
                onChange={onChangeCreditorShares}
                enableAdvanced={false}
                multiSelect={false}
            />
            {inputErrors.creditorShares && <HelperText type="error">{inputErrors.creditorShares}</HelperText>}
            <TransactionShareInput
                title="For"
                disabled={!editing}
                groupID={groupID}
                value={localEditingState.debitorShares}
                onChange={onChangeDebitorSharesShares}
                enableAdvanced={transaction.type === "purchase"}
                multiSelect={transaction.type === "purchase"}
            />
            {inputErrors.debitorShares && <HelperText type="error">{inputErrors.debitorShares}</HelperText>}

            {positions.state === "loading" ? (
                <LoadingIndicator />
            ) : (
                positions.contents.length > 0 && (
                    <Surface style={{ marginTop: 8 }} elevation={1}>
                        <List.Item title="Postions" />
                        <>
                            <Divider />
                            {positions.contents.map((position: TransactionPosition) => (
                                <PositionListItem
                                    key={position.id}
                                    groupID={groupID}
                                    currencySymbol={transaction.currencySymbol}
                                    position={position}
                                    editing={editing}
                                />
                            ))}
                            <Divider />
                            <List.Item
                                title="Total"
                                right={(props) => (
                                    <Text>
                                        {positions.contents
                                            .map((p: TransactionPosition) => p.price)
                                            .reduce((acc: number, curr: number) => acc + curr, 0)
                                            .toFixed(2)}{" "}
                                        {transaction.currencySymbol}
                                    </Text>
                                )}
                            />
                        </>
                    </Surface>
                )
            )}
            {transaction.type === "purchase" && editing && (
                <Button icon="add" onPress={onCreatePosition}>
                    Add Position
                </Button>
            )}
        </ScrollView>
    );
};

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

export default TransactionDetail;
