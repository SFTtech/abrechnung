import { Transaction } from "@abrechnung/types";
import { toISODateStringNullable } from "@abrechnung/utils";
import { List, Menu, Text, useTheme } from "react-native-paper";
import React, { useState } from "react";
import { getTransactionIcon } from "../constants/Icons";
import { useNavigation } from "@react-navigation/native";
import { deleteTransaction, pushLocalTransactionChanges } from "../core/database/transactions";
import { notify } from "../notifications";
import { MaterialIcons } from "@expo/vector-icons";

interface Props {
    transaction: Transaction;
}

export const TransactionListItem: React.FC<Props> = ({ transaction }) => {
    const [showMenu, setShowMenu] = useState(false);
    const navigation = useNavigation();
    const theme = useTheme();

    const openMenu = () => setShowMenu(true);
    const closeMenu = () => setShowMenu(false);

    const onDeleteTransaction = () => {
        deleteTransaction(transaction.groupID, transaction.id)
            .then(() => {
                pushLocalTransactionChanges(transaction.id).catch((err) => {
                    notify({
                        text: `Error while syncing transaction state with server: ${err.toString()}`,
                    });
                });
            })
            .catch((err) => {
                notify({ text: `Error while deleting transaction: ${err.toString()}` });
            });
    };

    return (
        <Menu
            visible={showMenu}
            onDismiss={closeMenu}
            anchor={
                <List.Item
                    key={transaction.id}
                    title={transaction.description}
                    description={toISODateStringNullable(transaction.billedAt)}
                    left={(props) => <List.Icon {...props} icon={getTransactionIcon(transaction.type)} />}
                    right={(props) => (
                        <>
                            {transaction.hasLocalChanges && (
                                <MaterialIcons
                                    style={{ marginRight: 8, marginTop: 4 }}
                                    size={20}
                                    color={theme.colors.primary}
                                    name="sync-disabled"
                                />
                            )}
                            <Text>
                                {transaction.value.toFixed(2)}
                                {transaction.currencySymbol}
                            </Text>
                        </>
                    )}
                    onPress={() =>
                        navigation.navigate("TransactionDetail", {
                            groupID: transaction.group_id,
                            transactionID: transaction.id,
                            editingStart: null,
                        })
                    }
                    onLongPress={openMenu}
                />
            }
        >
            <Menu.Item title="Delete" leadingIcon="delete" onPress={onDeleteTransaction} />
        </Menu>
    );
};

export default TransactionListItem;
