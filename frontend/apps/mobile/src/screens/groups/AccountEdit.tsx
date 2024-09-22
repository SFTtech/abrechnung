import {
    deleteAccount,
    discardAccountChange,
    saveAccount,
    useAccount,
    useIsGroupWritable,
    wipAccountUpdated,
} from "@abrechnung/redux";
import { AccountValidator } from "@abrechnung/types";
import { useFocusEffect } from "@react-navigation/native";
import React, { useEffect, useLayoutEffect } from "react";
import { BackHandler, ScrollView, StyleSheet } from "react-native";
import { Button, Dialog, IconButton, Portal, useTheme } from "react-native-paper";
import { useApi } from "../../core/ApiProvider";
import { GroupStackScreenProps } from "../../navigation/types";
import { notify } from "../../notifications";
import { useAppDispatch } from "../../store";
import {
    LoadingIndicator,
    FormTextInput,
    FormTransactionShareInput,
    FormTagSelect,
    FormDateTimeInput,
} from "../../components";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

type FormSchema = z.infer<typeof AccountValidator>;

export const AccountEdit: React.FC<GroupStackScreenProps<"AccountEdit">> = ({ route, navigation }) => {
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const { api } = useApi();

    const { groupId, accountId } = route.params;

    const account = useAccount(groupId, accountId);
    const isGroupWritable = useIsGroupWritable(groupId);

    const onGoBack = React.useCallback(async () => {
        if (account) {
            return dispatch(discardAccountChange({ groupId, accountId: account.id }));
        }
        return;
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
        if (!isGroupWritable) {
            navigation.replace("AccountDetail", { accountId, groupId });
        }
    }, [navigation, accountId, isGroupWritable, groupId]);

    const {
        control,
        handleSubmit,
        reset: resetForm,
        watch,
        getValues,
    } = useForm<FormSchema>({
        resolver: zodResolver(AccountValidator),
        defaultValues:
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
    });

    const onSubmit = React.useCallback(
        (values: FormSchema) => {
            if (!account) {
                return;
            }

            dispatch(wipAccountUpdated({ ...account, ...values }));
            dispatch(saveAccount({ groupId: groupId, accountId: account.id, api }))
                .unwrap()
                .then(({ account }) => {
                    navigation.replace("AccountDetail", {
                        accountId: account.id,
                        groupId: groupId,
                    });
                })
                .catch(() => {
                    notify({ text: "Error saving account" });
                });
        },
        [dispatch, account, navigation, groupId, api]
    );

    React.useEffect(() => {
        const { unsubscribe } = watch(() => {
            if (account) {
                dispatch(wipAccountUpdated({ ...account, ...getValues() }));
            }
        });
        return unsubscribe;
    }, [dispatch, account, getValues, watch]);

    const cancelEdit = React.useCallback(() => {
        if (!account) {
            return;
        }

        dispatch(discardAccountChange({ groupId, accountId: account.id }));
        resetForm();
        navigation.pop();
    }, [dispatch, groupId, account, navigation, resetForm]);

    useLayoutEffect(() => {
        navigation.setOptions({
            onGoBack: onGoBack,
            headerTitle: account?.name ?? "",
            headerRight: () => {
                return (
                    <>
                        <Button onPress={cancelEdit} textColor={theme.colors.error}>
                            Cancel
                        </Button>
                        <Button onPress={handleSubmit(onSubmit)}>Save</Button>
                        <IconButton icon="delete" iconColor={theme.colors.error} onPress={openConfirmDeleteModal} />
                    </>
                );
            },
        } as any);
    }, [theme, account, navigation, handleSubmit, onSubmit, cancelEdit, onGoBack]);

    if (account == null) {
        return <LoadingIndicator />;
    }

    return (
        <ScrollView style={styles.container}>
            <FormTextInput label="Name" style={styles.input} name="name" control={control} />
            <FormTextInput label="Description" style={styles.input} name="description" control={control} />
            {account.type === "clearing" && (
                <>
                    <FormDateTimeInput
                        control={control}
                        name="date_info"
                        label="Date"
                        editable={true}
                        style={styles.input}
                    />
                    <FormTagSelect control={control} name="tags" groupId={groupId} label="Tags" disabled={false} />
                    <FormTransactionShareInput
                        name="clearing_shares"
                        control={control}
                        title="Participated"
                        groupId={groupId}
                        disabled={false}
                        excludedAccounts={[account.id]}
                        enableAdvanced={true}
                        multiSelect={true}
                    />
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
        borderStyle: "solid",
        borderBottomColor: "#bebebe",
        borderBottomWidth: 1,
        borderTopRightRadius: 4,
        borderTopLeftRadius: 4,
        backgroundColor: "#1e1e1e",
    },
});

export default AccountEdit;
