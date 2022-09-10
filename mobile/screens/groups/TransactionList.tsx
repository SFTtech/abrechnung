import { RefreshControl, ScrollView, StyleSheet } from "react-native";
import { GroupTabScreenProps } from "../../types";
import { Appbar, Divider, FAB, List, Menu, Portal, RadioButton, Text, useTheme } from "react-native-paper";
import * as React from "react";
import { useEffect, useLayoutEffect, useState } from "react";
import { useIsFocused } from "@react-navigation/native";
import { getTransactionIcon, purchaseIcon, transferIcon } from "../../constants/Icons";
import { createTransaction } from "../../core/database/transactions";
import { useRecoilValue, useRecoilValueLoadable } from "recoil";
import { activeGroupIDState } from "../../core/groups";
import { transactionState } from "../../core/transactions";
import { Transaction, TransactionType } from "../../core/types";
import { createComparator, lambdaComparator, toISODateString, toISOString } from "../../core/utils";
import { syncLocalGroupState } from "../../core/sync";
import LoadingIndicator from "../../components/LoadingIndicator";


export default function TransactionList({ route, navigation }: GroupTabScreenProps<"TransactionList">) {
    const theme = useTheme();
    const groupID = useRecoilValue(activeGroupIDState);
    const transactions = useRecoilValueLoadable(transactionState(groupID));

    const [refreshing, setRefreshing] = useState(false);
    const [isFapOpen, setFabOpen] = useState(false);
    const [isMenuOpen, setMenuOpen] = useState(false);
    const [sortedTransactions, setSortedTransactions] = useState([]);

    const [sortMode, setSortMode] = useState("last_changed"); // billed_at, description

    const onRefresh = () => {
        setRefreshing(true);
        syncLocalGroupState(groupID).then(() => setRefreshing(false));
    };

    const isFocused = useIsFocused();

    useLayoutEffect(() => {
        if (isFocused) {
            navigation.getParent().setOptions({
                headerTitle: "Transactions",
                headerRight: () => {
                    return (
                        <Menu
                            visible={isMenuOpen}
                            onDismiss={() => setMenuOpen(false)}
                            anchor={<Appbar.Action
                                icon="more-vert"
                                onPress={() => setMenuOpen(true)} />}
                        >
                            <Text variant="labelLarge" style={{paddingLeft: 16, fontWeight: "bold"}}>Sort by</Text>
                            <RadioButton.Group value={sortMode} onValueChange={(value) => setSortMode(value)}>
                                <RadioButton.Item position="trailing" label="Last changed" value="last_changed" />
                                <RadioButton.Item position="trailing" label="Billed at" value="billed_at" />
                                <RadioButton.Item position="trailing" label="Description" value="description" />
                            </RadioButton.Group>
                        </Menu>
                    );
                },
            });
        }
    }, [isFocused, isMenuOpen, setMenuOpen, sortMode, theme, route, navigation]);

    useEffect(() => {
        if (transactions.state === "hasValue") {
            let sortComparator;
            switch (sortMode) {
                case "billed_at":
                    sortComparator = lambdaComparator((t: Transaction) => toISODateString(t.billed_at), true);
                    break;
                case "description":
                    sortComparator = lambdaComparator((t: Transaction) => t.description);
                    break;
                case "last_changed":
                default:
                    sortComparator = lambdaComparator((t: Transaction) => toISOString(t.last_changed));
                    break;
            }
            setSortedTransactions([...transactions.contents].sort(createComparator(sortComparator)));
        }
    }, [transactions, sortMode]);

    const createNewTransaction = (type: TransactionType) => {
        createTransaction(groupID, type).then(ret => {
            const [newTransactionID, creationDate] = ret;
            navigation.navigate("TransactionDetail", {
                transactionID: newTransactionID,
                groupID: groupID,
                editingStart: toISOString(creationDate),
            });
        })
            .catch(err => console.log("error creating new transaction"));
    };

    const renderItem = (transaction: Transaction) => (
        <List.Item
            key={transaction.id}
            title={transaction.description}
            description={toISODateString(transaction.billed_at)}
            left={props => <List.Icon {...props}
                                      icon={getTransactionIcon(transaction.type)} />}
            right={props => <Text>{transaction.value.toFixed(2)}{transaction.currency_symbol}</Text>}
            onPress={() => navigation.navigate("TransactionDetail", {
                groupID: transaction.group_id,
                transactionID: transaction.id,
                editingStart: null,
            })}
        />
    );

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            {transactions.state === "loading" ? (
                <LoadingIndicator />
            ) : sortedTransactions.map(transaction => renderItem(transaction))
            }
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
        marginBottom: 48,
    },
});
