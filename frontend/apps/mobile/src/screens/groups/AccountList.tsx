import { RefreshControl, ScrollView, StyleSheet } from "react-native";
import { Appbar, FAB, List, Menu, Portal, RadioButton, Text, TextInput, useTheme } from "react-native-paper";
import { useIsFocused } from "@react-navigation/native";
import { getAccountIcon } from "../../constants/Icons";
import { createAccount } from "../../core/database/accounts";
import { useRecoilValueLoadable } from "recoil";
import { useActiveGroup } from "../../core/groups";
import { accountBalancesState, accountStateByType } from "../../core/accounts";
import { Account, AccountBalance, AccountType } from "@abrechnung/types";
import * as React from "react";
import { useEffect, useLayoutEffect, useState } from "react";
import { syncLocalGroupState } from "../../core/sync";
import { createComparator, lambdaComparator } from "@abrechnung/utils";
import LoadingIndicator from "../../components/LoadingIndicator";
import { successColor } from "../../theme";
import { MaterialIcons } from "@expo/vector-icons";
import { GroupTabScreenProps } from "../../navigation/types";

type SortMode = "name" | "description" | "lastChanged";

type AccountTypeProp = { accountType: AccountType };

type Props = GroupTabScreenProps<"AccountList" | "ClearingAccountList"> & AccountTypeProp;

export const AccountList: React.FC<Props> = ({ navigation, accountType }) => {
    const theme = useTheme();

    const activeGroup = useActiveGroup();
    const accounts = useRecoilValueLoadable(accountStateByType({ groupID: activeGroup.id, accountType }));
    const accountBalances = useRecoilValueLoadable(accountBalancesState(activeGroup.id));

    const [isMenuOpen, setMenuOpen] = useState<boolean>(false);
    const [showSearchInput, setShowSearchInput] = useState<boolean>(false);
    const [search, setSearch] = useState<string>("");
    const [sortedAccounts, setSortedAccounts] = useState<Array<Account>>([]);
    const [sortMode, setSortMode] = useState<SortMode>("name");

    const [refreshing, setRefreshing] = useState<boolean>(false);
    const onRefresh = () => {
        setRefreshing(true);
        syncLocalGroupState(activeGroup.id).then(() => setRefreshing(false));
    };

    const isFocused = useIsFocused();

    const closeSearch = () => {
        setShowSearchInput(false);
        setSearch("");
    };

    useLayoutEffect(() => {
        if (isFocused) {
            navigation.getParent()?.setOptions({
                headerTitle: accountType === "personal" ? "People" : "Events",
                titleShown: !showSearchInput,
                headerRight: () => {
                    if (showSearchInput) {
                        return (
                            <>
                                <TextInput
                                    mode="outlined"
                                    dense={true}
                                    style={{ flexGrow: 1 }}
                                    onChangeText={(val) => setSearch(val)}
                                />
                                <Appbar.Action icon="close" onPress={closeSearch} />
                            </>
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
                                    onValueChange={(value) => setSortMode(value as SortMode)}
                                >
                                    <RadioButton.Item position="trailing" label="Name" value="name" />
                                    <RadioButton.Item position="trailing" label="Description" value="description" />
                                    <RadioButton.Item position="trailing" label="Last changed" value="lastChanged" />
                                </RadioButton.Group>
                            </Menu>
                        </>
                    );
                },
            });
        } else {
            // !isFocuesd
            closeSearch();
        }
    }, [isFocused, showSearchInput, isMenuOpen, setMenuOpen, sortMode, theme, navigation, accountType]);

    useEffect(() => {
        if (accounts.state === "hasValue") {
            let sortComparator;
            switch (sortMode) {
                case "name":
                    sortComparator = lambdaComparator((a: Account) => a.name);
                    break;
                case "description":
                    sortComparator = lambdaComparator((a: Account) => a.description);
                    break;
                case "lastChanged":
                default:
                    sortComparator = lambdaComparator((a: Account) => a.lastChanged.toISOString(), true);
                    break;
            }
            setSortedAccounts(
                [...accounts.contents]
                    .filter(
                        (a) =>
                            search === "" ||
                            a.description.toLowerCase().includes(search.toLowerCase()) ||
                            a.name.toLowerCase().includes(search.toLowerCase())
                    )
                    .sort(createComparator(sortComparator))
            );
        }
    }, [accounts, sortMode, search]);

    const createNewAccount = () => {
        createAccount(activeGroup.id, accountType)
            .then((res) => {
                const [newAccountID, creationDate] = res;
                navigation.navigate("AccountEdit", {
                    accountID: newAccountID,
                    groupID: activeGroup.id,
                    editingStart: creationDate.toISOString(),
                });
            })
            .catch((err) => console.log("error creating new account"));
    };

    const renderItem = (account: Account) => {
        const balance: AccountBalance | undefined = accountBalances.getValue().get(account.id);
        if (balance === undefined) {
            return null;
        }
        const textColor = balance.balance > 0 ? successColor : theme.colors.error;
        return (
            <List.Item
                key={account.id}
                title={account.name}
                description={account.description}
                left={(props) => <List.Icon {...props} icon={getAccountIcon(account.type)} />}
                right={(props) => (
                    <>
                        {/* {account.hasLocalChanges && (
                            <MaterialIcons
                                style={{ marginRight: 8, marginTop: 4 }}
                                size={20}
                                color={theme.colors.primary}
                                name="sync-disabled"
                            />
                        )} */}
                        <Text style={{ color: textColor }}>
                            {balance.balance.toFixed(2)} {activeGroup.currencySymbol}
                        </Text>
                    </>
                )}
                onPress={() =>
                    navigation.navigate("AccountDetail", {
                        accountID: account.id,
                        groupID: activeGroup.id,
                    })
                }
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
            ) : (
                sortedAccounts.map((item) => renderItem(item))
            )}
            <Portal>
                <FAB style={styles.fab} visible={isFocused} icon="add" onPress={createNewAccount} />
            </Portal>
        </ScrollView>
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
        bottom: 48,
    },
});

export default AccountList;
