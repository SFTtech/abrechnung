import {
    deleteTransaction,
    discardTransactionChange,
    saveTransaction,
    selectTransactionHasPositions,
    useIsGroupWritable,
    useTransaction,
    useWipTransactionPositions,
    wipTransactionUpdated,
} from "@abrechnung/redux";
import { TransactionPosition, TransactionValidator } from "@abrechnung/types";
import { useFocusEffect } from "@react-navigation/native";
import * as React from "react";
import { useEffect, useLayoutEffect } from "react";
import { BackHandler, ScrollView, StyleSheet, View } from "react-native";
import {
    Button,
    Chip,
    Dialog,
    Divider,
    IconButton,
    List,
    Portal,
    Surface,
    Text,
    TextInput,
    useTheme,
} from "react-native-paper";
import {
    FormDateTimeInput,
    FormNumericInput,
    FormTagSelect,
    FormTextInput,
    FormTransactionShareInput,
    LoadingIndicator,
} from "../../components";
import { PositionListItem } from "../../components/PositionListItem";
import { useApi } from "../../core/ApiProvider";
import { GroupStackScreenProps } from "../../navigation/types";
import { notify } from "../../notifications";
import { useAppDispatch, useAppSelector } from "../../store";
import { SerializedError } from "@reduxjs/toolkit";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

type FormSchema = z.infer<typeof TransactionValidator>;

export const TransactionDetail: React.FC<GroupStackScreenProps<"TransactionDetail">> = ({ route, navigation }) => {
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const { api } = useApi();
    const { groupId, transactionId, editing } = route.params;

    const [confirmDeleteModalOpen, setConfirmDeleteModalOpen] = React.useState(false);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const transaction = useTransaction(groupId, transactionId)!;
    const [showPositions, setShowPositions] = React.useState(false);
    const hasPositions = useAppSelector((state) => selectTransactionHasPositions(state, groupId, transactionId));
    const positions = useWipTransactionPositions(groupId, transaction.id);
    const totalPositionValue = positions.reduce((acc, curr) => acc + curr.price, 0);

    const isGroupWritable = useIsGroupWritable(groupId);

    const onGoBack = React.useCallback(async () => {
        if (editing && transaction != null) {
            dispatch(discardTransactionChange({ groupId, transactionId: transaction.id }));
        }
        return;
    }, [dispatch, editing, transaction, groupId]);

    const onDeleteTransaction = React.useCallback(() => {
        dispatch(deleteTransaction({ api, groupId, transactionId }))
            .unwrap()
            .then(() => {
                navigation.pop();
            })
            .catch((err) => {
                notify({ text: `Error while deleting transaction: ${err.toString()}` });
            });
    }, [api, groupId, transactionId, dispatch, navigation]);

    const closeConfirmDeleteModal = () => setConfirmDeleteModalOpen(false);
    const openConfirmDeleteModal = () => setConfirmDeleteModalOpen(true);

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
        if (editing && !isGroupWritable) {
            navigation.replace("TransactionDetail", { transactionId, groupId, editing: false });
        }
    }, [editing, isGroupWritable, transactionId, groupId, navigation]);

    const {
        control,
        handleSubmit,
        reset: resetForm,
        watch,
        getValues,
    } = useForm<FormSchema>({
        resolver: zodResolver(TransactionValidator),
        defaultValues:
            transaction === undefined
                ? {}
                : {
                      type: transaction.type,
                      name: transaction.name,
                      value: transaction.value,
                      currency_symbol: transaction.currency_symbol,
                      currency_conversion_rate: transaction.currency_conversion_rate,
                      description: transaction.description ?? "",
                      creditor_shares: transaction.creditor_shares,
                      debitor_shares: transaction.debitor_shares,
                      billed_at: transaction.billed_at,
                      tags: transaction.tags,
                  },
    });
    const value = watch("value");
    const currencySymbol = watch("currency_symbol");

    const onSubmit = React.useCallback(
        (values: FormSchema) => {
            if (!transaction) {
                return;
            }

            dispatch(wipTransactionUpdated({ ...transaction, ...values }));
            dispatch(saveTransaction({ api, transactionId, groupId }))
                .unwrap()
                .then(({ transaction }) => {
                    navigation.replace("TransactionDetail", {
                        transactionId: transaction.id,
                        groupId: groupId,
                        editing: false,
                    });
                })
                .catch((e: SerializedError) => {
                    notify({ text: `Error while saving transaction: ${e.message}` });
                });
        },
        [dispatch, groupId, navigation, transaction, api, transactionId]
    );

    React.useEffect(() => {
        const { unsubscribe } = watch(() => {
            if (transaction) {
                dispatch(wipTransactionUpdated({ ...transaction, ...getValues() }));
            }
        });
        return unsubscribe;
    }, [dispatch, transaction, getValues, watch]);

    const edit = React.useCallback(() => {
        navigation.navigate("TransactionDetail", {
            transactionId: transactionId,
            groupId: groupId,
            editing: true,
        });
    }, [navigation, transactionId, groupId]);

    const cancelEdit = React.useCallback(() => {
        dispatch(discardTransactionChange({ transactionId, groupId }));
        resetForm();
        if (transactionId < 0) {
            navigation.navigate("BottomTabNavigator", {
                screen: "TransactionList",
                params: { groupId },
            });
        } else {
            navigation.navigate("TransactionDetail", {
                transactionId: transactionId,
                groupId: groupId,
                editing: false,
            });
        }
    }, [dispatch, groupId, navigation, transactionId, resetForm]);

    useLayoutEffect(() => {
        navigation.setOptions({
            onGoBack: onGoBack,
            headerTitle: transaction?.name ?? "",
            headerRight: () => {
                if (!isGroupWritable) {
                    return null;
                }
                if (editing) {
                    return (
                        <>
                            <Button onPress={cancelEdit} textColor={theme.colors.error}>
                                Cancel
                            </Button>
                            <Button onPress={handleSubmit(onSubmit)}>Save</Button>
                            <IconButton icon="delete" iconColor={theme.colors.error} onPress={openConfirmDeleteModal} />
                        </>
                    );
                }
                return (
                    <>
                        <Button onPress={edit}>Edit</Button>
                        <IconButton icon="delete" iconColor={theme.colors.error} onPress={openConfirmDeleteModal} />
                    </>
                );
            },
        } as any);
    }, [
        theme,
        editing,
        isGroupWritable,
        navigation,
        handleSubmit,
        onSubmit,
        onGoBack,
        cancelEdit,
        edit,
        transaction,
        onDeleteTransaction,
    ]);

    if (transaction == null) {
        return <LoadingIndicator />;
    }

    const inputStyles = editing
        ? styles.input
        : {
              marginBottom: 4,
              backgroundColor: theme.colors.background,
          };

    return (
        <ScrollView style={styles.container}>
            <FormTextInput label="Name" editable={editing} style={inputStyles} name="name" control={control} />
            <FormTextInput
                label="Description"
                editable={editing}
                style={inputStyles}
                name="description"
                control={control}
            />
            <FormDateTimeInput
                label="Billed At"
                editable={editing}
                style={inputStyles}
                name="billed_at"
                control={control}
            />
            <FormNumericInput
                name="value"
                control={control}
                label="Value"
                editable={editing}
                keyboardType="numeric"
                style={inputStyles}
                right={<TextInput.Affix text={currencySymbol} />}
            />
            {editing ? (
                <FormTagSelect name="tags" control={control} groupId={groupId} label="Tags" disabled={false} />
            ) : (
                <View
                    style={{
                        borderTopRightRadius: theme.roundness,
                        borderTopLeftRadius: theme.roundness,
                        backgroundColor: theme.colors.background,
                        borderBottomColor: theme.colors.secondary,
                        borderBottomWidth: 0.5,
                        marginBottom: 4,
                        padding: 10,
                        minHeight: 55,
                        paddingLeft: 16,
                    }}
                >
                    <Text
                        style={{
                            color: theme.colors.primary,
                            fontWeight: theme.fonts.labelSmall.fontWeight,
                            fontSize: theme.fonts.labelSmall.fontSize,
                        }}
                    >
                        Tags
                    </Text>
                    <View style={{ display: "flex", flexDirection: "row", flexWrap: "wrap" }}>
                        {transaction.tags.map((tag) => (
                            <Chip
                                key={tag}
                                mode="outlined"
                                style={{
                                    marginRight: 4,
                                    backgroundColor: theme.colors.background,
                                    borderColor: theme.colors.primary,
                                }}
                                compact={true}
                            >
                                {tag}
                            </Chip>
                        ))}
                    </View>
                </View>
            )}

            <FormTransactionShareInput
                title="Paid by"
                name="creditor_shares"
                control={control}
                groupId={groupId}
                disabled={!editing}
                enableAdvanced={false}
                multiSelect={false}
            />
            <FormTransactionShareInput
                title="For"
                name="debitor_shares"
                control={control}
                disabled={!editing}
                groupId={groupId}
                enableAdvanced={transaction.type === "purchase"}
                multiSelect={transaction.type === "purchase"}
            />

            {transaction.type === "purchase" && !showPositions && editing && !hasPositions ? (
                <Button icon="add" onPress={() => setShowPositions(true)}>
                    Add Position
                </Button>
            ) : (showPositions && editing) || hasPositions ? (
                <Surface style={{ marginTop: 8 }} elevation={1}>
                    <List.Item title="Postions" />
                    <Divider />
                    {positions.map((position: TransactionPosition) => (
                        <PositionListItem
                            key={position.id}
                            transactionId={transactionId}
                            groupId={groupId}
                            currency_symbol={transaction.currency_symbol}
                            position={position}
                            editing={editing}
                        />
                    ))}
                    <Divider />
                    <List.Item
                        title="Total"
                        right={() => (
                            <Text>
                                {totalPositionValue.toFixed(2)} {transaction.currency_symbol}
                            </Text>
                        )}
                    />
                    <List.Item
                        title="Remaining"
                        right={() => (
                            <Text>
                                {((value ?? 0) - totalPositionValue).toFixed(2)} {transaction.currency_symbol}
                            </Text>
                        )}
                    />
                </Surface>
            ) : null}
            <Portal>
                <Dialog visible={confirmDeleteModalOpen} onDismiss={closeConfirmDeleteModal}>
                    <Dialog.Content>
                        <Text>Do you really want to delete this transaction?</Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={closeConfirmDeleteModal}>No</Button>
                        <Button onPress={onDeleteTransaction} textColor={theme.colors.error}>
                            Yes
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
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
        borderStyle: "solid",
        borderBottomColor: "#bebebe",
        borderBottomWidth: 1,
        borderTopRightRadius: 4,
        borderTopLeftRadius: 4,
        backgroundColor: "#1e1e1e",
    },
});

export default TransactionDetail;
