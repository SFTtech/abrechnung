import { RefreshControl, ScrollView, StyleSheet } from "react-native";
import { GroupTabScreenProps } from "../../types";
import { FAB, List, Portal, Text, useTheme } from "react-native-paper";
import { useIsFocused } from "@react-navigation/native";
import { getAccountIcon } from "../../constants/Icons";
import { createAccount } from "../../core/database/accounts";
import { useRecoilValue, useRecoilValueLoadable } from "recoil";
import { activeGroupIDState, activeGroupState } from "../../core/groups";
import { AccountBalance, accountBalancesState, accountStateByType } from "../../core/accounts";
import { Account } from "../../core/types";
import * as React from "react";
import { useLayoutEffect, useState } from "react";
import { syncLocalGroupState } from "../../core/sync";
import { toISOString } from "../../core/utils";
import LoadingIndicator from "../../components/LoadingIndicator";
import { successColor } from "../../theme";

export default function AccountList({ navigation, accountType }) {
    const theme = useTheme();

    const groupID = useRecoilValue(activeGroupIDState);
    const activeGroup = useRecoilValue(activeGroupState);
    const accounts = useRecoilValueLoadable(accountStateByType({groupID, accountType}));
    const accountBalances = useRecoilValueLoadable(accountBalancesState(groupID));

    const [refreshing, setRefreshing] = useState(false);
    const onRefresh = () => {
        setRefreshing(true);
        syncLocalGroupState(groupID).then(() => setRefreshing(false));
    };

    const isFocused = useIsFocused();

    useLayoutEffect(() => {
        if (isFocused) {
            navigation.getParent().setOptions({
                headerTitle: "People",
                headerRight: () => {
                },
            });
        }
    }, [isFocused, navigation]);

    const createNewAccount = () => {
        createAccount(groupID, accountType).then(res => {
            const [newAccountID, creationDate] = res;
            navigation.navigate("AccountEdit", {
                accountID: newAccountID,
                groupID: groupID,
                editingStart: toISOString(creationDate),
            });
        })
            .catch(err => console.log("error creating new account"));
    };

    const renderItem = (account: Account) => {
        const balance: AccountBalance = accountBalances.contents[account.id];
        const textColor = balance.balance > 0 ? successColor : theme.colors.error;
        return (
            <List.Item
                key={account.id}
                title={account.name}
                description={account.description}
                left={props => <List.Icon {...props} icon={getAccountIcon(account.type)} />}
                right={props => <Text style={{color: textColor}}>{balance.balance.toFixed(2)} {activeGroup.currency_symbol}</Text>}
                onPress={() => navigation.navigate("AccountDetail", {
                    accountID: account.id,
                    groupID: groupID,
                    editingStart: null,
                })}
            />
        );
    };

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            {accounts.state === "loading" || accountBalances.state === "loading" ? (
                <LoadingIndicator />
            ) : accounts.contents.map(item => renderItem(item))}
            <Portal>
                <FAB
                    style={styles.fab}
                    visible={isFocused}
                    icon="add"
                    onPress={createNewAccount}
                />
            </Portal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {},
    item: {
        // backgroundColor: "#f9c2ff",
        padding: 20,
        marginVertical: 8,
        marginHorizontal: 16,
    },
    fab: {
        position: "absolute",
        margin: 16,
        right: 0,
        bottom: 48,
    },
});
