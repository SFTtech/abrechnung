import { GroupStackParamList } from "../../types";
import { BackHandler, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, HelperText, TextInput, useTheme } from "react-native-paper";
import * as React from "react";
import { useEffect, useLayoutEffect, useState } from "react";
import { deleteLocalAccountChanges, pushLocalAccountChanges, updateAccount } from "../../core/database/accounts";
import { useRecoilValue } from "recoil";
import { accountByIDState } from "../../core/accounts";
import { notify } from "../../notifications";
import { StackScreenProps } from "@react-navigation/stack";
import { useFocusEffect } from "@react-navigation/native";
import { ValidationError } from "../../core/types";
import TransactionShareInput from "../../components/transaction_shares/TransactionShareInput";

export default function AccountEdit({
                                        route,
                                        navigation,
                                    }: StackScreenProps<GroupStackParamList, "AccountEdit">) {
    const theme = useTheme();

    const { groupID, accountID, editingStart } = route.params;

    const account = useRecoilValue(accountByIDState({ groupID, accountID }));
    const [localEditingState, setLocalEditingState] = useState(null);
    const [inputErrors, setInputErrors] = useState({});

    useLayoutEffect(() => {
        navigation.setOptions({
            onGoBack: onGoBack,
            headerTitle: localEditingState?.name ?? account?.name ?? "",
            headerRight: () => {
                return (
                    <>
                        <Button onPress={cancelEdit} textColor={theme.colors.error}>Cancel</Button>
                        <Button onPress={save}>Save</Button>
                    </>
                );
            },
        });
    }, [theme, account, navigation, localEditingState, setLocalEditingState]); // FIXME: figure out why we need setLocalEditingState as an effect dependency

    const onGoBack = async () => {
        if (account != null) {
            return await deleteLocalAccountChanges(groupID, account.id, editingStart);
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
        }, [account]),
    );

    useEffect(() => {
        if (account != null) {
            setInputErrors({});
            setLocalEditingState(prevState => {
                return {
                    ...prevState,
                    name: account.name,
                    description: account.description,
                    priority: account.priority,
                    clearing_shares: account.clearing_shares,
                    owning_user_id: account.owning_user_id,
                };
            });
        }
    }, [account]);

    const save = () => {
        updateAccount({
            ...account,
            ...localEditingState,
        })
            .then(() => {
                setInputErrors({});
                pushLocalAccountChanges(account.id)
                    .then(updatedAccount => {
                        navigation.navigate("AccountDetail", {
                            accountID: updatedAccount.id,
                            groupID: groupID,
                        });
                    })
                    .catch(err => {
                        console.log("error on pushing account to server", err);
                        navigation.navigate("AccountDetail", {
                            accountID: account.id,
                            groupID: groupID,
                        });
                    });
            })
            .catch(err => {
                if (err instanceof ValidationError) {
                    setInputErrors(err.data);
                } else {
                    console.log("error saving account details to local state:", err);
                    notify({ text: `Error while saving account: ${err.toString()}` });
                }
            });
    };

    const cancelEdit = () => {
        deleteLocalAccountChanges(groupID, account.id, editingStart).then(deletedAccount => {
            if (deletedAccount) {
                navigation.navigate("BottomTabNavigator", { screen: "AccountList" });
            } else {
                setLocalEditingState({
                    name: account.name,
                    description: account.description,
                    priority: account.priority,
                    owning_user_id: account.owning_user_id,
                });
                navigation.navigate("AccountDetail", { accountID: accountID, groupID: groupID });
            }
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

    if (account == null || localEditingState == null) {
        return (
            <View>
                <ActivityIndicator animating={true} />
            </View>
        );
    }

    return (
        <View
            style={styles.container}
        >
            <TextInput
                label="Name"
                value={localEditingState.name}
                style={styles.input}
                editable={true}
                onChangeText={onChangeLocalEditingValueFactory("name")}
                error={inputErrors.hasOwnProperty("name")}
            />
            {inputErrors.hasOwnProperty("name") && (
                <HelperText type="error">{inputErrors["name"]}</HelperText>
            )}
            <TextInput
                label="Description"
                value={localEditingState.description}
                style={styles.input}
                editable={true}
                onChangeText={onChangeLocalEditingValueFactory("description")}
                error={inputErrors.hasOwnProperty("description")}
            />
            {inputErrors.hasOwnProperty("description") && (
                <HelperText type="error">{inputErrors["description"]}</HelperText>
            )}
            {account.type === "clearing" && (
                <>
                    <TransactionShareInput
                        title="Participated"
                        disabled={false}
                        groupID={groupID}
                        value={localEditingState.clearing_shares}
                        onChange={onChangeLocalEditingValueFactory("clearing_shares")}
                        enableAdvanced={true}
                        multiSelect={true}
                        excludedAccounts={[account.id]}
                    />
                    {inputErrors.hasOwnProperty("clearing_shares") && (
                        <HelperText type="error">{inputErrors["clearing_shares"]}</HelperText>
                    )}
                </>
            )}

        </View>
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
