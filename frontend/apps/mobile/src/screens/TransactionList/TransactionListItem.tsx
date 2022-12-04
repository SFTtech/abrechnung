import { deleteTransaction, selectTransactionById } from "@abrechnung/redux";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import { List, Menu, Text, useTheme } from "react-native-paper";
import { getTransactionIcon } from "../../constants/Icons";
import { api } from "../../core/api";
import { notify } from "../../notifications";
import { selectTransactionSlice, useAppDispatch, useAppSelector } from "../../store";

interface Props {
    groupId: number;
    transactionId: number;
}

export const TransactionListItem: React.FC<Props> = ({ groupId, transactionId }) => {
    const [showMenu, setShowMenu] = useState(false);
    const dispatch = useAppDispatch();
    const navigation = useNavigation();
    const theme = useTheme();

    const transaction = useAppSelector((state) =>
        selectTransactionById({ state: selectTransactionSlice(state), groupId, transactionId })
    );

    const openMenu = () => setShowMenu(true);
    const closeMenu = () => setShowMenu(false);

    const onDeleteTransaction = () => {
        dispatch(deleteTransaction({ api, groupId, transactionId }))
            .unwrap()
            .catch((err) => {
                notify({ text: `Error while deleting transaction: ${err.toString()}` });
            });
    };

    if (transaction === undefined) {
        return null;
    }

    return (
        <Menu
            visible={showMenu}
            onDismiss={closeMenu}
            anchor={
                <List.Item
                    key={transactionId}
                    title={transaction.name}
                    description={transaction.billedAt}
                    left={(props) => <List.Icon {...props} icon={getTransactionIcon(transaction.type)} />}
                    right={(props) => (
                        <>
                            {transaction.hasLocalChanges ? (
                                <MaterialIcons
                                    style={{ marginRight: 8, marginTop: 4 }}
                                    size={20}
                                    color={theme.colors.primary}
                                    name="sync-disabled"
                                />
                            ) : null}
                            <Text>
                                {transaction.value.toFixed(2)}
                                {transaction.currencySymbol}
                            </Text>
                        </>
                    )}
                    onPress={() =>
                        navigation.navigate("TransactionDetail", {
                            groupId: groupId,
                            transactionId: transactionId,
                            editing: false,
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
