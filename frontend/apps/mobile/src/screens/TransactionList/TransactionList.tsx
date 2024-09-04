/* eslint-disable react/prop-types */
import { TransactionSortMode } from "@abrechnung/core";
import {
    createTransaction,
    fetchTransactions,
    selectGroupTransactionsStatus,
    useCurrentUserPermissions,
    useGroup,
    useSortedTransactions,
} from "@abrechnung/redux";
import { Transaction, TransactionType } from "@abrechnung/types";
import { useIsFocused } from "@react-navigation/native";
import * as React from "react";
import { useLayoutEffect, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Appbar, FAB, Menu, Portal, RadioButton, Text, useTheme } from "react-native-paper";
import LoadingIndicator from "../../components/LoadingIndicator";
import Searchbar from "../../components/style/Searchbar";
import { purchaseIcon, transferIcon } from "../../constants/Icons";
import { useApi } from "../../core/ApiProvider";
import { GroupTabScreenProps } from "../../navigation/types";
import { selectActiveGroupId, useAppDispatch, useAppSelector } from "../../store";
import TransactionListItem from "./TransactionListItem";

type Props = GroupTabScreenProps<"TransactionList">;

export const TransactionList: React.FC<Props> = ({ navigation }) => {
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const { api } = useApi();

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const groupId = useAppSelector((state) => selectActiveGroupId(state))!;
    const group = useGroup(groupId);
    const [search, setSearch] = useState<string>("");
    const [sortMode, setSortMode] = useState<TransactionSortMode>("last_changed");
    const transactions = useSortedTransactions(groupId, sortMode, search);
    const transactionStatus = useAppSelector((state) => selectGroupTransactionsStatus(state, groupId));
    const permissions = useCurrentUserPermissions(groupId);

    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [isFapOpen, setFabOpen] = useState<boolean>(false);
    const [isMenuOpen, setMenuOpen] = useState<boolean>(false);
    const [showSearchInput, setShowSearchInput] = useState<boolean>(false);

    const onRefresh = () => {
        setRefreshing(true);
        dispatch(fetchTransactions({ groupId, api, fetchAnyway: true }))
            .unwrap()
            .then(() => setRefreshing(false))
            .catch(() => setRefreshing(false));
    };

    const isFocused = useIsFocused();

    const closeSearch = () => {
        setShowSearchInput(false);
        setSearch("");
    };

    const openSearch = () => {
        setShowSearchInput(true);
    };

    const openSortMenu = () => setMenuOpen(true);
    const closeSortMenu = () => setMenuOpen(false);

    useLayoutEffect(() => {
        if (!isFocused) {
            closeSearch();
            setFabOpen(false);
            return;
        }
        navigation.getParent()?.setOptions({
            headerTitle: group?.name ?? "",
            titleShown: !showSearchInput,
            headerRight: () => {
                if (showSearchInput) {
                    return (
                        <Searchbar
                            placeholder="Search"
                            value={search}
                            clearButtonMode="always"
                            onClearIconPress={closeSearch}
                            onChangeText={setSearch}
                            autoFocus={true}
                        />
                    );
                }
                return (
                    <>
                        <Appbar.Action icon="search" onPress={openSearch} />
                        <Menu
                            visible={isMenuOpen}
                            onDismiss={closeSortMenu}
                            anchor={<Appbar.Action icon="more-vert" onPress={openSortMenu} />}
                        >
                            <Text variant="labelLarge" style={{ paddingLeft: 16, fontWeight: "bold" }}>
                                Sort by
                            </Text>
                            <RadioButton.Group
                                value={sortMode}
                                onValueChange={(value) => setSortMode(value as TransactionSortMode)}
                            >
                                <RadioButton.Item position="trailing" label="Last changed" value="last_changed" />
                                <RadioButton.Item position="trailing" label="Billed at" value="billed_at" />
                                <RadioButton.Item position="trailing" label="Name" value="name" />
                            </RadioButton.Group>
                        </Menu>
                    </>
                );
            },
        });
    }, [group, isFocused, showSearchInput, isMenuOpen, search, sortMode, theme, navigation]);

    const createNewTransaction = (type: TransactionType) => {
        dispatch(createTransaction({ groupId, type }))
            .unwrap()
            .then(({ transaction }) => {
                navigation.navigate("TransactionDetail", {
                    transactionId: transaction.id,
                    groupId: transaction.group_id,
                    editing: true,
                });
            });
    };

    if (transactionStatus === "loading") {
        console.log("loading in transaction list");
        return (
            <View style={styles.container}>
                <LoadingIndicator />
            </View>
        );
    }

    return (
        <FlatList
            style={styles.container}
            data={transactions}
            renderItem={({ item }: { item: Transaction }) => (
                <TransactionListItem key={item.id} groupId={groupId} transactionId={item.id} />
            )}
            onRefresh={onRefresh}
            refreshing={refreshing}
            ListFooterComponent={
                permissions?.can_write ? (
                    <Portal>
                        <FAB.Group
                            style={styles.fab}
                            open={isFapOpen}
                            visible={isFocused}
                            icon="add"
                            actions={[
                                {
                                    icon: transferIcon,
                                    label: "Transfer",
                                    onPress: () => createNewTransaction("transfer"),
                                },
                                {
                                    icon: purchaseIcon,
                                    label: "Purchase",
                                    onPress: () => createNewTransaction("purchase"),
                                },
                            ]}
                            onStateChange={({ open }) => setFabOpen(open)}
                        />
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
        paddingBottom: 52,
    },
});

export default TransactionList;
