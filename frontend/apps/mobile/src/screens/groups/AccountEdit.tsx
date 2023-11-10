import {
    deleteAccount,
    discardAccountChange,
    saveAccount,
    selectAccountById,
    selectCurrentUserPermissions,
    wipAccountUpdated,
} from "@abrechnung/redux";
import { AccountValidator } from "@abrechnung/types";
import { fromISOStringNullable, toFormikValidationSchema, toISODateStringNullable } from "@abrechnung/utils";
import { useFocusEffect } from "@react-navigation/native";
import { useFormik } from "formik";
import React, { useEffect, useLayoutEffect } from "react";
import { BackHandler, ScrollView, StyleSheet, View } from "react-native";
import {
    ActivityIndicator,
    Button,
    Dialog,
    HelperText,
    IconButton,
    Portal,
    ProgressBar,
    TextInput,
    useTheme,
} from "react-native-paper";
import DateTimeInput from "../../components/DateTimeInput";
import { TagSelect } from "../../components/tag-select";
import TransactionShareInput from "../../components/transaction-shares/TransactionShareInput";
import { useApi } from "../../core/ApiProvider";
import { GroupStackScreenProps } from "../../navigation/types";
import { notify } from "../../notifications";
import { selectAccountSlice, useAppDispatch, useAppSelector } from "../../store";

export const AccountEdit: React.FC<GroupStackScreenProps<"AccountEdit">> = ({ route, navigation }) => {
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const { api } = useApi();

    const { groupId, accountId } = route.params;

    const account = useAppSelector((state) =>
        selectAccountById({ state: selectAccountSlice(state), groupId, accountId })
    );
    const permissions = useAppSelector((state) => selectCurrentUserPermissions({ state: state, groupId }));

    const onGoBack = React.useCallback(async () => {
        if (account) {
            return dispatch(discardAccountChange({ groupId, accountId: account.id }));
        }
    }, [dispatch, account, groupId]);

    const [confirmDeleteModalOpen, setConfirmDeleteModalOpen] = React.useState(false);
    const onDeleteAccount = React.useCallback(() => {
        dispatch(deleteAccount({ api, groupId, accountId }))
            .unwrap()
            .then(() => {
                navigation.pop(2);
            })
            .catch((err) => {
                notify({ text: `Error while deleting account: ${err.toString()}` });
            });
    }, [api, groupId, accountId, dispatch, navigation]);

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
        if (permissions === undefined || !permissions.canWrite) {
            navigation.replace("AccountDetail", { accountId, groupId });
        }
    }, [navigation, accountId, permissions, groupId]);

    const formik = useFormik({
        initialValues:
            account === undefined
                ? {}
                : account.type === "clearing"
                ? {
                      type: account.type,
                      name: account.name,
                      description: account.description,
                      clearing_shares: account.clearing_shares,
                      date_info: account.date_info,
                      tags: account.tags,
                  }
                : {
                      type: account.type,
                      name: account.name,
                      description: account.description,
                      owning_user_id: account.owning_user_id,
                  },
        validationSchema: toFormikValidationSchema(AccountValidator),
        onSubmit: (values, { setSubmitting }) => {
            if (!account) {
                return;
            }

            setSubmitting(true);
            dispatch(wipAccountUpdated({ ...account, ...values }));
            dispatch(saveAccount({ groupId: groupId, accountId: account.id, api }))
                .unwrap()
                .then(() => {
                    setSubmitting(false);
                    navigation.pop(1);
                })
                .catch(() => {
                    setSubmitting(false);
                });
        },
        enableReinitialize: true,
    });

    const onUpdate = React.useCallback(() => {
        if (account) {
            dispatch(wipAccountUpdated({ ...account, ...formik.values }));
        }
    }, [dispatch, account, formik]);

    const cancelEdit = React.useCallback(() => {
        if (!account) {
            return;
        }

        dispatch(discardAccountChange({ groupId, accountId: account.id }));
        formik.resetForm();
        navigation.pop();
    }, [dispatch, groupId, account, navigation, formik]);

    useLayoutEffect(() => {
        navigation.setOptions({
            onGoBack: onGoBack,
            headerTitle: formik.values?.name ?? account?.name ?? "",
            headerRight: () => {
                return (
                    <>
                        <Button onPress={cancelEdit} textColor={theme.colors.error}>
                            Cancel
                        </Button>
                        <Button onPress={() => formik.handleSubmit}>Save</Button>
                        <IconButton icon="delete" iconColor={theme.colors.error} onPress={openConfirmDeleteModal} />
                    </>
                );
            },
        });
    }, [theme, account, navigation, formik, cancelEdit, onGoBack]);

    if (account == null) {
        return (
            <View>
                <ActivityIndicator animating={true} />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            {formik.isSubmitting ? <ProgressBar indeterminate /> : null}
            <TextInput
                label="Name"
                value={formik.values.name}
                style={styles.input}
                editable={true}
                onChangeText={(val) => formik.setFieldValue("name", val)}
                onBlur={onUpdate}
                error={formik.touched.name && !!formik.errors.name}
            />
            {formik.touched.name && !!formik.errors.name ? (
                <HelperText type="error">{formik.errors.name}</HelperText>
            ) : null}
            <TextInput
                label="Description"
                value={formik.values.description}
                style={styles.input}
                editable={true}
                onBlur={onUpdate}
                onChangeText={(val) => formik.setFieldValue("description", val)}
                error={formik.touched.description && !!formik.errors.description}
            />
            {formik.touched.description && !!formik.errors.description ? (
                <HelperText type="error">{formik.errors.description}</HelperText>
            ) : null}
            {account.type === "personal" && formik.touched.owning_user_id && !!formik.errors.owning_user_id && (
                <HelperText type="error">{formik.errors.owning_user_id}</HelperText>
            )}
            {formik.values.type === "clearing" && (
                <>
                    <DateTimeInput
                        label="Date"
                        value={fromISOStringNullable(formik.values.date_info)}
                        editable={true}
                        style={styles.input}
                        onChange={(val) => formik.setFieldValue("dateInfo", toISODateStringNullable(val))}
                        onBlur={onUpdate}
                        error={formik.touched.date_info && !!formik.errors.date_info}
                    />
                    {formik.touched.date_info && !!formik.errors.date_info && (
                        <HelperText type="error">{formik.errors.date_info}</HelperText>
                    )}
                    <TagSelect
                        groupId={groupId}
                        label="Tags"
                        value={formik.values.tags}
                        disabled={false}
                        onChange={(val) => {
                            formik.setFieldValue("tags", val);
                            onUpdate();
                        }}
                    />
                    {formik.touched.tags && !!formik.errors.tags && (
                        <HelperText type="error">{formik.errors.tags}</HelperText>
                    )}
                    <TransactionShareInput
                        title="Participated"
                        disabled={false}
                        groupId={groupId}
                        value={formik.values.clearing_shares}
                        onChange={(newValue) => {
                            formik.setFieldValue("clearingShares", newValue);
                            onUpdate();
                        }}
                        enableAdvanced={true}
                        multiSelect={true}
                        excludedAccounts={[account.id]}
                        error={formik.touched.clearing_shares && !!formik.errors.clearing_shares}
                    />
                    {formik.touched.clearing_shares && !!formik.errors.clearing_shares && (
                        <HelperText type="error">{formik.errors.clearing_shares}</HelperText>
                    )}
                </>
            )}
            <Portal>
                <Dialog visible={confirmDeleteModalOpen} onDismiss={closeConfirmDeleteModal}>
                    <Dialog.Content>
                        Do you really want to delete this {account.type === "clearing" ? "event" : "account"}?
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={closeConfirmDeleteModal}>No</Button>
                        <Button onPress={onDeleteAccount} textColor={theme.colors.error}>
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

export default AccountEdit;
