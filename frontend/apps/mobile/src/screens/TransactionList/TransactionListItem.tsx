import { selectTransactionById } from "@abrechnung/redux";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React from "react";
import { List, Text, useTheme } from "react-native-paper";
import { getTransactionIcon } from "../../constants/Icons";
import { selectTransactionSlice, useAppSelector } from "../../store";

interface Props {
    groupId: number;
    transactionId: number;
}

export const TransactionListItem: React.FC<Props> = ({ groupId, transactionId }) => {
    const navigation = useNavigation();
    const theme = useTheme();

    const transaction = useAppSelector((state) =>
        selectTransactionById({ state: selectTransactionSlice(state), groupId, transactionId })
    );

    if (transaction === undefined) {
        return null;
    }

    return (
        <List.Item
            key={transactionId}
            title={transaction.name}
            description={(props) => (
                <>
                    {transaction.description && <Text>{transaction.description}</Text>}
                    <Text>{transaction.billed_at}</Text>
                </>
            )}
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
                        {transaction.currency_symbol}
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
        />
    );
};

export default TransactionListItem;
