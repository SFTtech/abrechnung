import { RefreshControl, ScrollView, StyleSheet } from "react-native";
import { GroupTabScreenProps } from "../../navigation/types";
import { Appbar, FAB, Menu, Portal, RadioButton, Text, TextInput, useTheme } from "react-native-paper";
import * as React from "react";
import { useLayoutEffect, useState } from "react";
import { useIsFocused } from "@react-navigation/native";
import { purchaseIcon, transferIcon } from "../../constants/Icons";
import { TransactionType } from "@abrechnung/types";
import LoadingIndicator from "../../components/LoadingIndicator";
import TransactionListItem from "../../components/TransactionListItem";
import {
    useAppSelector,
    selectTransactionSlice,
    useAppDispatch,
    selectActiveGroupId,
    selectUiSlice,
} from "../../store";
import {
    fetchTransactions,
    selectGroupTransactionsStatus,
    createPurchase,
    createTransfer,
    selectSortedTransactions,
    selectCurrentUserPermissions,
} from "@abrechnung/redux";
import { api } from "../../core/api";
import { toISODateString } from "@abrechnung/utils";
import { TransactionSortMode } from "@abrechnung/core";

export const TransactionList: React.FC<GroupTabScreenProps<"TransactionList">> = ({ navigation, route }) => {
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const groupId = useAppSelector((state) => selectActiveGroupId({ state: selectUiSlice(state) })) as number; // TODO: proper typing
    const [search, setSearch] = useState<string>("");
    const [sortMode, setSortMode] = useState<TransactionSortMode>("lastChanged");
    const transactions = useAppSelector((state) =>
        selectSortedTransactions({ state: selectTransactionSlice(state), groupId, searchTerm: search, sortMode })
    );
    const transactionStatus = useAppSelector((state) =>
        selectGroupTransactionsStatus({ state: selectTransactionSlice(state), groupId })
    );
    const permissions = useAppSelector((state) => selectCurrentUserPermissions({ state: state, groupId }));

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

    useLayoutEffect(() => {
        if (!isFocused) {
            closeSearch();
            setFabOpen(false);
            return;
        }
        navigation.getParent()?.setOptions({
            headerTitle: "Transactions",
            titleShown: !showSearchInput,
            headerRight: () => {
                if (showSearchInput) {
                    return (
                        <>
                            <TextInput
                                mode="outlined"
                                dense={true}
                                autoFocus={true}
                                style={{ flexGrow: 1 }}
                                onChangeText={(val) => setSearch(val)}
                            />
                            <Appbar.Action icon="close" onPress={closeSearch} />
                        </>
                    );
                }
                return (
                    <>
                        <Appbar.Action icon="search" onPress={openSearch} />
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
                                onValueChange={(value) => setSortMode(value as TransactionSortMode)}
                            >
                                <RadioButton.Item position="trailing" label="Last changed" value="lastChanged" />
                                <RadioButton.Item position="trailing" label="Billed at" value="billedAt" />
                                <RadioButton.Item position="trailing" label="Description" value="description" />
                            </RadioButton.Group>
                        </Menu>
                    </>
                );
            },
        });
    }, [isFocused, showSearchInput, isMenuOpen, setMenuOpen, sortMode, theme, navigation]);

    const createNewTransaction = (type: TransactionType) => {
        if (type === "purchase") {
            dispatch(createPurchase({ groupId }))
                .unwrap()
                .then(({ transaction }) => {
                    navigation.navigate("TransactionDetail", {
                        transactionId: transaction.id,
                        groupId: transaction.groupID,
                        editing: true,
                    });
                });
        } else if (type === "transfer") {
            dispatch(
                createTransfer({
                    transaction: {
                        type: "transfer",
                        groupID: groupId,
                        description: "",
                        billedAt: toISODateString(new Date()),
                        currencyConversionRate: 1.0,
                        currencySymbol: "€",
                        debitorShares: {},
                        creditorShares: {},
                        value: 0,
                    },
                    keepWip: true,
                    api,
                })
            )
                .unwrap()
                .then(({ transaction }) => {
                    navigation.navigate("TransactionDetail", {
                        transactionId: transaction.id,
                        groupId: transaction.groupID,
                        editing: true,
                    });
                })
                .catch(() => {
                    console.log("error creating new transaction");
                });
        } else {
            console.error("unknown transaction type");
        }
    };

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            {transactionStatus === "loading" ? (
                <LoadingIndicator />
            ) : (
                transactions.map((transaction) => (
                    <TransactionListItem key={transaction.id} groupId={groupId} transactionId={transaction.id} />
                ))
            )}
            {permissions?.canWrite ? (
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
            ) : null}
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
        marginBottom: 48,
    },
});

export default TransactionList;
