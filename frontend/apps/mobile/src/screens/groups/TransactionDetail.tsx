import {
    discardTransactionChange,
    saveTransaction,
    selectCurrentUserPermissions,
    selectTransactionById,
    selectTransactionPositions,
    selectTransactionPositionTotal,
    wipPositionAdded,
    deleteTransaction,
    wipTransactionUpdated,
} from "@abrechnung/redux";
import { TransactionPosition, TransactionValidator } from "@abrechnung/types";
import { fromISOStringNullable, toFormikValidationSchema, toISODateString } from "@abrechnung/utils";
import { useFocusEffect } from "@react-navigation/native";
import { useFormik } from "formik";
import * as React from "react";
import { useEffect, useLayoutEffect, useState } from "react";
import { BackHandler, ScrollView, StyleSheet, View } from "react-native";
import {
    ActivityIndicator,
    Button,
    Chip,
    Dialog,
    Divider,
    HelperText,
    IconButton,
    List,
    Portal,
    ProgressBar,
    Surface,
    Text,
    TextInput,
    useTheme,
} from "react-native-paper";
import DateTimeInput from "../../components/DateTimeInput";
import { NumericInput } from "../../components/NumericInput";
import PositionListItem from "../../components/PositionListItem";
import TransactionShareInput from "../../components/transaction-shares/TransactionShareInput";
import { api } from "../../core/api";
import { GroupStackScreenProps } from "../../navigation/types";
import { TagSelect } from "../../components/tag-select";
import { notify } from "../../notifications";
import { selectTransactionSlice, useAppDispatch, useAppSelector } from "../../store";

export const TransactionDetail: React.FC<GroupStackScreenProps<"TransactionDetail">> = ({ route, navigation }) => {
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const { groupId, transactionId, editing } = route.params;

    const [confirmDeleteModalOpen, setConfirmDeleteModalOpen] = React.useState(false);

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

    const onGoBack = React.useCallback(async () => {
        if (editing && transaction != null) {
            dispatch(discardTransactionChange({ groupId, transactionId: transaction.id, api }));
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
    }, [groupId, transactionId, dispatch, navigation]);

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
        if (editing && (permissions === undefined || !permissions.canWrite)) {
            navigation.replace("TransactionDetail", { transactionId, groupId, editing: false });
        }
    }, [editing, permissions, transactionId, groupId, navigation]);

    const formik = useFormik({
        initialValues:
            transaction === undefined
                ? {}
                : {
                      type: transaction.type,
                      name: transaction.name,
                      value: transaction.value,
                      currencySymbol: transaction.currencySymbol,
                      currencyConversionRate: transaction.currencyConversionRate,
                      description: transaction.description ?? "",
                      creditorShares: transaction.creditorShares,
                      debitorShares: transaction.debitorShares,
                      billedAt: transaction.billedAt,
                      tags: transaction.tags,
                  },
        validationSchema: toFormikValidationSchema(TransactionValidator),
        onSubmit: (values, { setSubmitting }) => {
            if (!transaction) {
                return;
            }

            setSubmitting(true);
            dispatch(wipTransactionUpdated({ ...transaction, ...values }));
            dispatch(saveTransaction({ api, transactionId, groupId }))
                .unwrap()
                .then(({ transactionContainer }) => {
                    navigation.navigate("TransactionDetail", {
                        transactionId: transactionContainer.transaction.id,
                        groupId: groupId,
                        editing: false,
                    });
                    setSubmitting(false);
                })
                .catch(() => {
                    setSubmitting(false);
                });
        },
        enableReinitialize: true,
    });

    const onUpdate = React.useCallback(() => {
        if (transaction) {
            dispatch(wipTransactionUpdated({ ...transaction, ...formik.values }));
        }
    }, [dispatch, transaction, formik]);

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
                        formik.resetForm();
                    }
                    navigation.replace("TransactionDetail", {
                        transactionId: transactionId,
                        groupId: groupId,
                        editing: false,
                    });
                }
            });
    }, [dispatch, transaction, groupId, navigation, transactionId, formik]);

    useLayoutEffect(() => {
        navigation.setOptions({
            onGoBack: onGoBack,
            headerTitle: formik.values?.name ?? transaction?.name ?? "",
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
                            <Button onPress={() => formik.handleSubmit()}>Save</Button>
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
        });
    }, [theme, editing, permissions, navigation, formik, onGoBack, cancelEdit, edit, transaction, onDeleteTransaction]);

    const onCreatePosition = () => {
        dispatch(
            wipPositionAdded({
                groupId,
                transactionId,
                position: {
                    name: "",
                    price: 0,
                    usages: {},
                    communistShares: 0,
                },
            })
        );
    };

    if (transaction == null) {
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
            {formik.isSubmitting && <ProgressBar indeterminate />}
            <TextInput
                label="Name"
                value={formik.values.name ?? ""}
                editable={editing}
                // disabled={!editing}
                onChangeText={(val) => formik.setFieldValue("name", val)}
                onBlur={onUpdate}
                style={inputStyles}
                error={formik.touched.name && !!formik.errors.name}
            />
            {formik.touched.name && !!formik.errors.name && <HelperText type="error">{formik.errors.name}</HelperText>}
            <TextInput
                label="Description"
                value={formik.values.description ?? ""}
                editable={editing}
                // disabled={!editing}
                onChangeText={(val) => formik.setFieldValue("description", val)}
                onBlur={onUpdate}
                style={inputStyles}
                error={formik.touched.description && !!formik.errors.description}
            />
            {formik.touched.description && !!formik.errors.description && (
                <HelperText type="error">{formik.errors.description}</HelperText>
            )}
            <DateTimeInput
                label="Billed At"
                value={fromISOStringNullable(formik.values.billedAt)}
                editable={editing}
                style={inputStyles}
                onChange={(val) => {
                    formik.setFieldValue("billedAt", toISODateString(val));
                    onUpdate();
                }}
                error={formik.touched.billedAt && !!formik.errors.billedAt}
            />
            {formik.touched.billedAt && !!formik.errors.billedAt && (
                <HelperText type="error">{formik.errors.billedAt}</HelperText>
            )}
            <NumericInput
                label="Value"
                value={formik.values.value ?? 0}
                editable={editing}
                keyboardType="numeric"
                onChange={(val) => formik.setFieldValue("value", val)}
                onBlur={onUpdate}
                style={inputStyles}
                right={<TextInput.Affix text={formik.values.currencySymbol} />}
                error={formik.touched.value && !!formik.errors.value}
            />
            {formik.touched.value && !!formik.errors.value && (
                <HelperText type="error">{formik.errors.value}</HelperText>
            )}
            {editing ? (
                <>
                    <TagSelect
                        groupId={groupId}
                        label="Tags"
                        value={formik.values.tags ?? []}
                        disabled={false}
                        onChange={(val) => {
                            formik.setFieldValue("tags", val);
                            onUpdate();
                        }}
                    />
                    {formik.touched.tags && !!formik.errors.tags && (
                        <HelperText type="error">{formik.errors.tags}</HelperText>
                    )}
                </>
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

            <TransactionShareInput
                title="Paid by"
                groupId={groupId}
                disabled={!editing}
                value={formik.values.creditorShares ?? {}}
                onChange={(val) => formik.setFieldValue("creditorShares", val)}
                enableAdvanced={false}
                multiSelect={false}
                error={formik.touched.creditorShares && !!formik.errors.creditorShares}
            />
            {formik.touched.creditorShares && !!formik.errors.creditorShares && (
                <HelperText type="error">{formik.errors.creditorShares}</HelperText>
            )}
            <TransactionShareInput
                title="For"
                disabled={!editing}
                groupId={groupId}
                value={formik.values.debitorShares ?? {}}
                onChange={(val) => formik.setFieldValue("debitorShares", val)}
                enableAdvanced={transaction.type === "purchase"}
                multiSelect={transaction.type === "purchase"}
                error={formik.touched.debitorShares && !!formik.errors.debitorShares}
            />
            {formik.touched.debitorShares && !!formik.errors.debitorShares && (
                <HelperText type="error">{formik.errors.debitorShares}</HelperText>
            )}

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
                                    {((formik.values?.value ?? 0) - positionTotal).toFixed(2)}{" "}
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
        borderBottomStyle: "solid",
        borderBottomColor: "#bebebe",
        borderBottomWidth: 1,
        borderTopRightRadius: 4,
        borderTopLeftRadius: 4,
        backgroundColor: "#1e1e1e",
    },
});

export default TransactionDetail;
