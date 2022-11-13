import { GroupStackScreenProps } from "../../navigation/types";
import { BackHandler, ScrollView, StyleSheet, View } from "react-native";
import * as React from "react";
import { useEffect, useLayoutEffect, useState } from "react";
import {
    ActivityIndicator,
    Button,
    Divider,
    HelperText,
    List,
    ProgressBar,
    Surface,
    Text,
    TextInput,
    useTheme,
} from "react-native-paper";
import TransactionShareInput from "../../components/transaction-shares/TransactionShareInput";
import DateTimeInput from "../../components/DateTimeInput";
import PositionListItem from "../../components/PositionListItem";
import { notify } from "../../notifications";
import { useFocusEffect } from "@react-navigation/native";
import {
    Transaction,
    TransactionPosition,
    TransactionShare,
    TransactionValidationErrors,
    validateTransactionDetails,
} from "@abrechnung/types";
import { useAppSelector, selectTransactionSlice, useAppDispatch } from "../../store";
import {
    discardTransactionChange,
    saveTransaction,
    selectTransactionById,
    selectTransactionPositions,
    selectTransactionPositionTotal,
    wipPositionAdded,
    wipTransactionUpdated,
    selectCurrentUserPermissions,
} from "@abrechnung/redux";
import { api } from "../../core/api";
import { toISODateString, fromISOString } from "@abrechnung/utils";
import { NumericInput } from "../../components/NumericInput";

type LocalEditingState = Partial<
    Pick<
        Transaction,
        | "description"
        | "value"
        | "billedAt"
        | "currencySymbol"
        | "currencyConversionRate"
        | "creditorShares"
        | "debitorShares"
    >
>;

export const TransactionDetail: React.FC<GroupStackScreenProps<"TransactionDetail">> = ({ route, navigation }) => {
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const { groupId, transactionId, editing } = route.params;

    const [progress, setProgress] = useState(false);

    const transaction = useAppSelector((state) =>
        selectTransactionById({ state: selectTransactionSlice(state), groupId, transactionId })
    );
    const positions = useAppSelector((state) =>
        selectTransactionPositions({ state: selectTransactionSlice(state), groupId, transactionId })
    );
    const positionTotal = useAppSelector((state) =>
        selectTransactionPositionTotal({ state: selectTransactionSlice(state), groupId, transactionId })
    );
    const permissions = useAppSelector((state) => selectCurrentUserPermissions({ state: state, groupId }));
    const [localEditingState, setLocalEditingState] = useState<LocalEditingState>({});
    const [inputErrors, setInputErrors] = useState<TransactionValidationErrors>({});
    const onGoBack = React.useCallback(async () => {
        if (editing && transaction != null) {
            dispatch(discardTransactionChange({ groupId, transactionId: transaction.id, api }));
        }
        return;
    }, [dispatch, editing, transaction, groupId]);

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
        if (transaction == null) {
            return;
        }

        setInputErrors({});
        setLocalEditingState({
            description: transaction.description,
            value: transaction.value,
            billedAt: transaction.billedAt,
            currencySymbol: transaction.currencySymbol,
            currencyConversionRate: transaction.currencyConversionRate,
            creditorShares: transaction.creditorShares,
            debitorShares: transaction.debitorShares,
        });
    }, [transaction]);

    useEffect(() => {
        if (editing && (permissions === undefined || !permissions.canWrite)) {
            navigation.replace("TransactionDetail", { transactionId, groupId, editing: false });
        }
    }, [editing, permissions, transactionId, groupId, navigation]);

    const onUpdate = React.useCallback(() => {
        if (transaction) {
            // TODO: validate
            dispatch(wipTransactionUpdated({ ...transaction, ...localEditingState }));
        }
    }, [dispatch, transaction, localEditingState]);

    const save = React.useCallback(() => {
        if (transaction === undefined || localEditingState === undefined) {
            return;
        }

        const updatedTransaction = { ...transaction, ...localEditingState };
        const validationErrors = validateTransactionDetails(updatedTransaction);

        if (Object.keys(validationErrors).length !== 0) {
            setInputErrors(validationErrors);
            return;
        }

        setProgress(true);
        onUpdate();
        dispatch(saveTransaction({ api, transactionId, groupId }))
            .unwrap()
            .then(({ transactionContainer }) => {
                setProgress(false);
                navigation.navigate("TransactionDetail", {
                    transactionId: transactionContainer.transaction.id,
                    groupId: groupId,
                    editing: false,
                });
            })
            .catch(() => {
                setProgress(false);
            });
    }, [onUpdate, dispatch, navigation, transactionId, groupId, transaction, setInputErrors, localEditingState]);

    const edit = React.useCallback(() => {
        navigation.navigate("TransactionDetail", {
            transactionId: transactionId,
            groupId: groupId,
            editing: true,
        });
    }, [navigation, transactionId, groupId]);

    const cancelEdit = React.useCallback(() => {
        dispatch(discardTransactionChange({ transactionId, groupId, api }))
            .unwrap()
            .then(({ deletedTransaction }) => {
                if (deletedTransaction) {
                    navigation.navigate("BottomTabNavigator", {
                        screen: "TransactionList",
                        params: { groupId },
                    });
                } else {
                    if (transaction) {
                        setLocalEditingState({
                            description: transaction.description,
                            value: transaction.value,
                            billedAt: transaction.billedAt,
                            currencySymbol: transaction.currencySymbol,
                            currencyConversionRate: transaction.currencyConversionRate,
                            creditorShares: transaction.creditorShares,
                            debitorShares: transaction.debitorShares,
                        });
                    }
                    navigation.replace("TransactionDetail", {
                        transactionId: transactionId,
                        groupId: groupId,
                        editing: false,
                    });
                }
            });
    }, [dispatch, transaction, groupId, navigation, transactionId]);

    useLayoutEffect(() => {
        navigation.setOptions({
            onGoBack: onGoBack,
            headerTitle: localEditingState?.description ?? transaction?.description ?? "",
            headerRight: () => {
                if (permissions === undefined || !permissions.canWrite) {
                    return null;
                }
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
    }, [theme, editing, permissions, navigation, localEditingState, onGoBack, cancelEdit, save, edit, transaction]);

    const onCreatePosition = () => {
        dispatch(
            wipPositionAdded({
                groupId,
                transactionId,
                position: {
                    transactionID: transactionId,
                    deleted: false,
                    name: "",
                    price: 0,
                    usages: {},
                    communistShares: 0,
                },
            })
        );
    };
    const onChangeDescription = (description: string) => {
        setLocalEditingState((prevState) => ({ ...prevState, description }));
    };

    const onChangeValue = (value: number) => {
        setLocalEditingState((prevState) => ({ ...prevState, value }));
    };

    const onChangedBilledAt = (billedAt: Date) => {
        if (transaction) {
            // TODO: validate
            dispatch(
                wipTransactionUpdated({ ...transaction, ...localEditingState, billedAt: toISODateString(billedAt) })
            );
        }
    };

    const onChangeCurrencySymbol = (currencySymbol: string) => {
        setLocalEditingState((prevState) => ({ ...prevState, currencySymbol }));
    };

    const onChangeCurrencyConversionRate = (currencyConversionRate: number) => {
        setLocalEditingState((prevState) => ({ ...prevState, currencyConversionRate }));
    };

    const onChangeCreditorShares = (creditorShares: TransactionShare) => {
        if (transaction) {
            // TODO: validate
            dispatch(wipTransactionUpdated({ ...transaction, creditorShares }));
        }
    };

    const onChangeDebitorSharesShares = (debitorShares: TransactionShare) => {
        if (transaction) {
            // TODO: validate
            dispatch(wipTransactionUpdated({ ...transaction, debitorShares }));
        }
    };

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
            {progress ? <ProgressBar indeterminate /> : null}
            <TextInput
                label="Description"
                value={localEditingState.description ?? transaction.description}
                editable={editing}
                // disabled={!editing}
                onChangeText={onChangeDescription}
                onBlur={onUpdate}
                style={inputStyles}
                error={inputErrors.description !== undefined}
            />
            {inputErrors.description && <HelperText type="error">{inputErrors.description}</HelperText>}
            <DateTimeInput
                label="Billed At"
                value={fromISOString(localEditingState.billedAt ?? transaction.billedAt)}
                editable={editing}
                style={inputStyles}
                onChange={onChangedBilledAt}
                error={inputErrors.billedAt !== undefined}
            />
            {inputErrors.billedAt && <HelperText type="error">{inputErrors.billedAt}</HelperText>}
            <NumericInput
                label="Value" // TODO: proper float input
                value={localEditingState.value ?? transaction.value}
                editable={editing}
                keyboardType="numeric"
                onChange={onChangeValue}
                onBlur={onUpdate}
                style={inputStyles}
                right={<TextInput.Affix text={transaction.currencySymbol} />}
                error={inputErrors.value !== undefined}
            />
            {inputErrors.value && <HelperText type="error">{inputErrors.value}</HelperText>}

            <TransactionShareInput
                title="Paid by"
                groupId={groupId}
                disabled={!editing}
                value={localEditingState.creditorShares ?? transaction.creditorShares}
                onChange={onChangeCreditorShares}
                enableAdvanced={false}
                multiSelect={false}
            />
            {inputErrors.creditorShares && <HelperText type="error">{inputErrors.creditorShares}</HelperText>}
            <TransactionShareInput
                title="For"
                disabled={!editing}
                groupId={groupId}
                value={localEditingState.debitorShares ?? transaction.debitorShares}
                onChange={onChangeDebitorSharesShares}
                enableAdvanced={transaction.type === "purchase"}
                multiSelect={transaction.type === "purchase"}
            />
            {inputErrors.debitorShares && <HelperText type="error">{inputErrors.debitorShares}</HelperText>}

            {positions.length > 0 && (
                <Surface style={{ marginTop: 8 }} elevation={1}>
                    <List.Item title="Postions" />
                    <>
                        <Divider />
                        {positions.map((position: TransactionPosition) => (
                            <PositionListItem
                                key={position.id}
                                groupId={groupId}
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
                                    {positionTotal.toFixed(2)} {transaction.currencySymbol}
                                </Text>
                            )}
                        />
                        <List.Item
                            title="Remaining"
                            right={(props) => (
                                <Text>
                                    {((localEditingState.value ?? transaction.value) - positionTotal).toFixed(2)}{" "}
                                    {transaction.currencySymbol}
                                </Text>
                            )}
                        />
                    </>
                </Surface>
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
