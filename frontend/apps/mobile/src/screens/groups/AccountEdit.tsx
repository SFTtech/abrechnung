import { GroupStackScreenProps } from "../../navigation/types";
import { BackHandler, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, HelperText, TextInput, useTheme } from "react-native-paper";
import * as React from "react";
import { useEffect, useLayoutEffect, useState } from "react";
import { deleteLocalAccountChanges, pushLocalAccountChanges, updateAccount } from "../../core/database/accounts";
import { useAccount } from "../../core/accounts";
import { notify } from "../../notifications";
import { useFocusEffect } from "@react-navigation/native";
import { Account, AccountValidationErrors, ClearingShares, ValidationError } from "@abrechnung/types";
import TransactionShareInput from "../../components/transaction_shares/TransactionShareInput";

type LocalEditingState = Pick<Account, "name" | "description" | "clearingShares" | "owningUserID">;

export const AccountEdit: React.FC<GroupStackScreenProps<"AccountEdit">> = ({ route, navigation }) => {
    const theme = useTheme();

    const { groupID, accountID, editingStart } = route.params;

    const account = useAccount(groupID, accountID);
    const [localEditingState, setLocalEditingState] = useState<LocalEditingState | null>(null);
    const [inputErrors, setInputErrors] = useState<AccountValidationErrors>({});

    const onGoBack = React.useCallback(async () => {
        return await deleteLocalAccountChanges(groupID, account.id, editingStart);
    }, [account, groupID, editingStart]);

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
        if (account != null) {
            setInputErrors({});
            setLocalEditingState((prevState) => {
                return {
                    ...prevState,
                    name: account.name,
                    description: account.description,
                    priority: account.priority,
                    clearingShares: account.clearingShares,
                    owningUserID: account.owningUserID,
                };
            });
        }
    }, [account]);

    const save = React.useCallback(() => {
        updateAccount({
            ...account,
            ...localEditingState,
        })
            .then(() => {
                setInputErrors({});
                pushLocalAccountChanges(account.id)
                    .then((updatedAccount) => {
                        navigation.navigate("AccountDetail", {
                            accountID: updatedAccount.id,
                            groupID: groupID,
                        });
                    })
                    .catch((err) => {
                        console.log("error on pushing account to server", err);
                        navigation.navigate("AccountDetail", {
                            accountID: account.id,
                            groupID: groupID,
                        });
                    });
            })
            .catch((err) => {
                if (err instanceof ValidationError) {
                    setInputErrors(err.data);
                } else {
                    console.log("error saving account details to local state:", err);
                    notify({ text: `Error while saving account: ${err.toString()}` });
                }
            });
    }, [account, localEditingState, groupID, setInputErrors, navigation]);

    const cancelEdit = React.useCallback(() => {
        deleteLocalAccountChanges(groupID, account.id, editingStart).then((deletedAccount) => {
            if (deletedAccount) {
                navigation.navigate("BottomTabNavigator", { screen: "AccountList" });
            } else {
                setLocalEditingState({
                    name: account.name,
                    description: account.description,
                    owningUserID: account.owningUserID,
                    clearingShares: account.clearingShares,
                });
                navigation.navigate("AccountDetail", {
                    accountID: accountID,
                    groupID: groupID,
                });
            }
        });
    }, [groupID, account, editingStart, navigation, setLocalEditingState, accountID]);

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
            <TextInput
                label="Name"
                value={localEditingState.name}
                style={styles.input}
                editable={true}
                onChangeText={onChangeName}
                error={inputErrors.name !== undefined}
            />
            {inputErrors.name && <HelperText type="error">{inputErrors.name}</HelperText>}
            <TextInput
                label="Description"
                value={localEditingState.description}
                style={styles.input}
                editable={true}
                onChangeText={onChangeDescription}
                error={inputErrors.description !== undefined}
            />
            {inputErrors.description && <HelperText type="error">{inputErrors.description}</HelperText>}
            {account.type === "clearing" && (
                <>
                    <TransactionShareInput
                        title="Participated"
                        disabled={false}
                        groupID={groupID}
                        value={localEditingState.clearingShares == null ? {} : localEditingState.clearingShares}
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
