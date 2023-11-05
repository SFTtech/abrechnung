import LoadingIndicator from "@/components/LoadingIndicator";
import Searchbar from "@/components/style/Searchbar";
import { getAccountIcon } from "@/constants/Icons";
import { useApi } from "@/core/ApiProvider";
import { GroupTabScreenProps } from "@/navigation/types";
import {
    selectAccountSlice,
    selectActiveGroupId,
    selectGroupSlice,
    selectUiSlice,
    useAppDispatch,
    useAppSelector,
} from "@/store";
import { successColor } from "@/theme";
import { AccountSortMode } from "@abrechnung/core";
import {
    createAccount,
    fetchAccounts,
    selectAccountBalances,
    selectCurrentUserPermissions,
    selectGroupAccountsStatus,
    selectGroupcurrency_symbol,
    selectSortedAccounts,
} from "@abrechnung/redux";
import { Account, AccountBalance, AccountType } from "@abrechnung/types";
import { MaterialIcons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import * as React from "react";
import { useLayoutEffect, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Appbar, FAB, List, Menu, Portal, RadioButton, Text, useTheme } from "react-native-paper";

type Props = GroupTabScreenProps<"AccountList" | "ClearingAccountList">;

export const AccountList: React.FC<Props> = ({ route, navigation }) => {
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const { api } = useApi();
    const accountType: AccountType = route.name === "AccountList" ? "personal" : "clearing";

    const groupId = useAppSelector((state) => selectActiveGroupId({ state: selectUiSlice(state) })) as number; // TODO: proper typing
    const [search, setSearch] = useState<string>("");
    const [sortMode, setSortMode] = useState<AccountSortMode>("name");
    const accounts = useAppSelector((state) =>
        selectSortedAccounts({
            state: selectAccountSlice(state),
            groupId,
            type: accountType,
            sortMode,
            searchTerm: search,
        })
    );
    const accountBalances = useAppSelector((state) => selectAccountBalances({ state, groupId }));
    const permissions = useAppSelector((state) => selectCurrentUserPermissions({ state: state, groupId }));
    const currency_symbol = useAppSelector((state) =>
        selectGroupcurrency_symbol({ state: selectGroupSlice(state), groupId })
    );
    const accountStatus = useAppSelector((state) =>
        selectGroupAccountsStatus({ state: selectAccountSlice(state), groupId })
    );

    const [isMenuOpen, setMenuOpen] = useState<boolean>(false);
    const [showSearchInput, setShowSearchInput] = useState<boolean>(false);

    const [refreshing, setRefreshing] = useState<boolean>(false);
    const onRefresh = () => {
        setRefreshing(true);
        dispatch(fetchAccounts({ groupId, api, fetchAnyway: true }))
            .unwrap()
            .then(() => setRefreshing(false))
            .catch(() => setRefreshing(false));
    };

    const isFocused = useIsFocused();

    const closeSearch = () => {
        setShowSearchInput(false);
        setSearch("");
    };

    useLayoutEffect(() => {
        if (!isFocused) {
            closeSearch();
            setMenuOpen(false);
            return;
        }

        navigation.getParent()?.setOptions({
            headerTitle: accountType === "personal" ? "People" : "Events",
            titleShown: !showSearchInput,
            headerRight: () => {
                if (showSearchInput) {
                    return (
                        <Searchbar
                            placeholder="Search"
                            clearButtonMode="always"
                            onClearIconPress={closeSearch}
                            onChangeText={(val) => setSearch(val)}
                            autoFocus={true}
                        />
                    );
                }
                return (
                    <>
                        <Appbar.Action icon="search" onPress={() => setShowSearchInput(true)} />
                        <Menu
                            visible={isMenuOpen}
                            onDismiss={() => setMenuOpen(false)}
                            anchor={<Appbar.Action icon="more-vert" onPress={() => setMenuOpen(true)} />}
                        >
                            <Text variant="labelLarge" style={{ paddingLeft: 16, fontWeight: "bold" }}>
                                Sort by
                            </Text>
                            <RadioButton.Group
                                value={sortMode}
                                onValueChange={(value) => setSortMode(value as AccountSortMode)}
                            >
                                <RadioButton.Item position="trailing" label="Name" value="name" />
                                <RadioButton.Item position="trailing" label="Description" value="description" />
                                <RadioButton.Item position="trailing" label="Last changed" value="last_changed" />
                            </RadioButton.Group>
                        </Menu>
                    </>
                );
            },
        });
    }, [isFocused, showSearchInput, isMenuOpen, setMenuOpen, sortMode, theme, navigation, accountType, search]);

    const createNewAccount = () => {
        dispatch(
            createAccount({
                groupId: groupId,
                type: accountType,
            })
        )
            .unwrap()
            .then(({ account }) => {
                navigation.navigate("AccountEdit", {
                    accountId: account.id,
                    groupId: groupId,
                });
            });
    };

    const renderItem = ({ item: account }: { item: Account }) => {
        const balance: AccountBalance | undefined = accountBalances[account.id];
        if (balance === undefined) {
            return null;
        }
        const textColor = balance.balance > 0 ? successColor : theme.colors.error;
        return (
            <List.Item
                key={account.id}
                title={account.name}
                description={(props) =>
                    account.type === "personal" ? (
                        account.description && <Text>{account.description}</Text>
                    ) : (
                        <>
                            {account.description && <Text>{account.description}</Text>}
                            <Text>{account.dateInfo}</Text>
                        </>
                    )
                }
                left={(props) => <List.Icon {...props} icon={getAccountIcon(account.type)} />}
                right={(props) => (
                    <>
                        {account.hasLocalChanges ? (
                            <MaterialIcons
                                style={{ marginRight: 8, marginTop: 4 }}
                                size={20}
                                color={theme.colors.primary}
                                name="sync-disabled"
                            />
                        ) : null}
                        <Text style={{ color: textColor }}>
                            {balance.balance.toFixed(2)} {currency_symbol}
                        </Text>
                    </>
                )}
                onPress={() =>
                    navigation.navigate("AccountDetail", {
                        accountId: account.id,
                        groupId: groupId,
                    })
                }
            />
        );
    };

    if (accountStatus === "loading") {
        return (
            <View style={styles.container}>
                <LoadingIndicator />
            </View>
        );
    }

    return (
        <FlatList
            style={styles.container}
            refreshing={refreshing}
            onRefresh={onRefresh}
            data={accounts}
            renderItem={renderItem}
            ListFooterComponent={
                permissions?.canWrite ? (
                    <Portal>
                        <FAB style={styles.fab} visible={isFocused} icon="add" onPress={createNewAccount} />
                    </Portal>
                ) : null
            }
        />
    );
};

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
        bottom: 52,
    },
});

export default AccountList;
