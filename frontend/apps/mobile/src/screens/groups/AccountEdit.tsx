import { GroupStackScreenProps } from "../../navigation/types";
import { BackHandler, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, HelperText, TextInput, useTheme, ProgressBar } from "react-native-paper";
import * as React from "react";
import { useEffect, useLayoutEffect, useState } from "react";
import { notify } from "../../notifications";
import { useFocusEffect } from "@react-navigation/native";
import { Account, AccountValidationErrors, ClearingShares, validateAccount, ValidationError } from "@abrechnung/types";
import TransactionShareInput from "../../components/transaction-shares/TransactionShareInput";
import { selectCurrentUserPermissions } from "@abrechnung/redux";
import { api } from "../../core/api";

import { selectAccountSlice, useAppDispatch, useAppSelector } from "../../store";
import { discardAccountChange, saveAccount, selectAccountById, wipAccountUpdated } from "@abrechnung/redux";

type LocalEditingState = Pick<Account, "name" | "description" | "clearingShares" | "owningUserID">;

export const AccountEdit: React.FC<GroupStackScreenProps<"AccountEdit">> = ({ route, navigation }) => {
    const theme = useTheme();
    const dispatch = useAppDispatch();

    const { groupId, accountId } = route.params;

    const account = useAppSelector((state) =>
        selectAccountById({ state: selectAccountSlice(state), groupId, accountId })
    );
    const permissions = useAppSelector((state) => selectCurrentUserPermissions({ state: state, groupId }));

    const [progress, setProgress] = useState(false);
    const [localEditingState, setLocalEditingState] = useState<LocalEditingState | null>(null);
    const [inputErrors, setInputErrors] = useState<AccountValidationErrors>({});

    const onGoBack = React.useCallback(async () => {
        if (account) {
            return dispatch(discardAccountChange({ groupId, accountId: account.id, api })).unwrap();
        }
    }, [dispatch, account, groupId]);

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

    useEffect(() => {
        if (account != null) {
            setInputErrors({});
            setLocalEditingState((prevState) => {
                return {
                    ...prevState,
                    name: account.name,
                    description: account.description,
                    clearingShares: account.clearingShares,
                    owningUserID: account.owningUserID,
                };
            });
        }
    }, [account]);

    const onUpdate = React.useCallback(() => {
        if (account) {
            dispatch(wipAccountUpdated({ ...account, ...localEditingState }));
        }
    }, [dispatch, account, localEditingState]);

    const save = React.useCallback(() => {
        if (localEditingState === null || account === undefined) {
            return;
        }

        const updatedAccount = { ...account, ...localEditingState };
        const validationErrors = validateAccount(updatedAccount);
        if (Object.keys(validationErrors).length !== 0) {
            setInputErrors(validationErrors);
            return;
        }

        setProgress(true);
        onUpdate();
        dispatch(saveAccount({ account: updatedAccount, api }))
            .unwrap()
            .then(() => {
                setProgress(false);
                navigation.pop(1);
            })
            .catch(() => {
                setProgress(false);
            });
    }, [dispatch, onUpdate, account, localEditingState, setInputErrors, navigation]);

    const cancelEdit = React.useCallback(() => {
        if (!account) {
            return;
        }

        dispatch(discardAccountChange({ groupId, accountId: account.id, api }))
            .unwrap()
            .then(({ deletedAccount }) => {
                if (deletedAccount) {
                    setLocalEditingState({
                        name: account.name,
                        description: account.description,
                        owningUserID: account.owningUserID,
                        clearingShares: account.clearingShares,
                    });
                }
                navigation.pop();
            });
    }, [dispatch, groupId, account, navigation, setLocalEditingState]);

    useLayoutEffect(() => {
        navigation.setOptions({
            onGoBack: onGoBack,
            headerTitle: localEditingState?.name ?? account?.name ?? "",
            headerRight: () => {
                return (
                    <>
                        <Button onPress={cancelEdit} textColor={theme.colors.error}>
                            Cancel
                        </Button>
                        <Button onPress={save}>Save</Button>
                    </>
                );
            },
        });
    }, [theme, account, navigation, localEditingState, cancelEdit, onGoBack, save]); // FIXME: figure out why we need setLocalEditingState as an effect dependency

    const onChangeName = (name: string) =>
        setLocalEditingState((prevState) => {
            return prevState === null ? null : { ...prevState, name: name };
        });
    const onChangeDescription = (description: string) =>
        setLocalEditingState((prevState) => {
            return prevState === null ? null : { ...prevState, description: description };
        });
    const onChangeClearingShares = (clearingShares: ClearingShares) =>
        setLocalEditingState((prevState) => {
            return prevState === null ? null : { ...prevState, clearingShares: clearingShares };
        });

    if (account == null || localEditingState == null) {
        return (
            <View>
                <ActivityIndicator animating={true} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {progress ? <ProgressBar indeterminate /> : null}
            <TextInput
                label="Name"
                value={localEditingState.name}
                style={styles.input}
                editable={true}
                onChangeText={onChangeName}
                onBlur={onUpdate}
                error={inputErrors.name !== undefined}
            />
            {inputErrors.name && <HelperText type="error">{inputErrors.name}</HelperText>}
            <TextInput
                label="Description"
                value={localEditingState.description}
                style={styles.input}
                editable={true}
                onBlur={onUpdate}
                onChangeText={onChangeDescription}
                error={inputErrors.description !== undefined}
            />
            {inputErrors.description && <HelperText type="error">{inputErrors.description}</HelperText>}
            {account.type === "clearing" && (
                <>
                    <TransactionShareInput
                        title="Participated"
                        disabled={false}
                        groupId={groupId}
                        value={localEditingState.clearingShares ?? account.clearingShares ?? {}}
                        onChange={onChangeClearingShares}
                        enableAdvanced={true}
                        multiSelect={true}
                        excludedAccounts={[account.id]}
                    />
                    {inputErrors.clearingShares && <HelperText type="error">{inputErrors.clearingShares}</HelperText>}
                </>
            )}
        </View>
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
