import { RefreshControl, ScrollView, StyleSheet } from "react-native";
import { GroupTabScreenProps } from "../../navigation/types";
import { Appbar, FAB, Menu, Portal, RadioButton, Text, TextInput, useTheme } from "react-native-paper";
import * as React from "react";
import { useEffect, useLayoutEffect, useState } from "react";
import { useIsFocused } from "@react-navigation/native";
import { purchaseIcon, transferIcon } from "../../constants/Icons";
import { createTransaction } from "../../core/database/transactions";
import { useRecoilValueLoadable } from "recoil";
import { useActiveGroupID } from "../../core/groups";
import { transactionState } from "../../core/transactions";
import { Transaction, TransactionType } from "@abrechnung/types";
import { createComparator, lambdaComparator, toISODateString } from "@abrechnung/utils";
import { syncLocalGroupState } from "../../core/sync";
import LoadingIndicator from "../../components/LoadingIndicator";
import TransactionListItem from "../../components/TransactionListItem";

type SortMode = "lastChanged" | "billedAt" | "description";

export const TransactionList: React.FC<GroupTabScreenProps<"TransactionList">> = ({ navigation }) => {
    const theme = useTheme();
    const groupID = useActiveGroupID();
    const transactions = useRecoilValueLoadable(transactionState(groupID));

    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [isFapOpen, setFabOpen] = useState<boolean>(false);
    const [isMenuOpen, setMenuOpen] = useState<boolean>(false);
    const [showSearchInput, setShowSearchInput] = useState<boolean>(false);
    const [search, setSearch] = useState<string>("");
    const [sortedTransactions, setSortedTransactions] = useState<Array<Transaction>>([]);

    const [sortMode, setSortMode] = useState<SortMode>("lastChanged");

    const onRefresh = () => {
        setRefreshing(true);
        syncLocalGroupState(groupID).then(() => setRefreshing(false));
    };

    const isFocused = useIsFocused();

    const closeSearch = () => {
        setShowSearchInput(false);
        setSearch("");
    };

    useLayoutEffect(() => {
        if (isFocused) {
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
                                    <RadioButton.Item position="trailing" label="Last changed" value="lastChanged" />
                                    <RadioButton.Item position="trailing" label="Billed at" value="billedAt" />
                                    <RadioButton.Item position="trailing" label="Description" value="description" />
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
    }, [isFocused, showSearchInput, isMenuOpen, setMenuOpen, sortMode, theme, navigation]);

    useEffect(() => {
        if (transactions.state === "hasValue") {
            let sortComparator;
            switch (sortMode) {
                case "billedAt":
                    sortComparator = lambdaComparator((t: Transaction) => toISODateString(t.billedAt), true);
                    break;
                case "description":
                    sortComparator = lambdaComparator((t: Transaction) => t.description);
                    break;
                case "lastChanged":
                default:
                    sortComparator = lambdaComparator((t: Transaction) => t.lastChanged.toISOString(), true);
                    break;
            }
            setSortedTransactions(
                [...transactions.contents]
                    .filter((t) => search === "" || t.description.toLowerCase().includes(search.toLowerCase()))
                    .sort(createComparator(sortComparator))
            );
        }
    }, [transactions, sortMode, search]);

    const createNewTransaction = (type: TransactionType) => {
        createTransaction(groupID, type)
            .then((ret) => {
                const [newTransactionID, creationDate] = ret;
                navigation.navigate("TransactionDetail", {
                    transactionID: newTransactionID,
                    groupID: groupID,
                    editingStart: creationDate.toISOString(),
                });
            })
            .catch((err) => console.log("error creating new transaction"));
    };

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            {transactions.state === "loading" ? (
                <LoadingIndicator />
            ) : (
                sortedTransactions.map((transaction) => (
                    <TransactionListItem key={transaction.id} transaction={transaction} />
                ))
            )}
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
                    onPress={() => {
                        if (isFapOpen) {
                            // do something if the speed dial is open
                        }
                    }}
                />
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
        marginBottom: 48,
    },
});

export default TransactionList;
