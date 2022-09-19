import { GroupStackParamList } from "../../types";
import { ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Divider, List, Text, useTheme } from "react-native-paper";
import * as React from "react";
import { useLayoutEffect } from "react";
import { useRecoilValue } from "recoil";
import { AccountBalance, accountBalancesState, accountByIDState } from "../../core/accounts";
import { toISODateString, toISOString } from "../../core/utils";
import { StackScreenProps } from "@react-navigation/stack";
import { Transaction } from "../../core/types";
import { getTransactionIcon } from "../../constants/Icons";
import TransactionShareInput from "../../components/transaction_shares/TransactionShareInput";
import { successColor } from "../../theme";
import { activeGroupState } from "../../core/groups";
import { transactionsInvolvingAccount } from "../../core/transactions";

export default function AccountDetail({
                                          route,
                                          navigation,
                                      }: StackScreenProps<GroupStackParamList, "AccountDetail">) {
    const theme = useTheme();

    const { groupID, accountID } = route.params;

    const activeGroup = useRecoilValue(activeGroupState);
    const account = useRecoilValue(accountByIDState({ groupID, accountID }));
    const accountBalances = useRecoilValue(accountBalancesState(groupID));
    const accountTransactions = useRecoilValue(transactionsInvolvingAccount({ groupID, accountID: account?.id }));

    useLayoutEffect(() => {
        navigation.setOptions({
            headerTitle: account?.name || "",
            headerRight: () => {
                return (
                    <Button onPress={edit}>Edit</Button>
                );
            },
        });
    }, [theme, account, navigation]);

    const edit = () => {
        navigation.navigate("AccountEdit", {
            accountID: accountID,
            groupID: groupID,
            editingStart: toISOString(new Date()),
        });
    };

    const renderTransactionListEntry = (transaction: Transaction) => (
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

    if (account == null) {
        return (
            <View>
                <ActivityIndicator animating={true} />
            </View>
        );
    }

    const balance: AccountBalance = accountBalances[account.id];
    const textColor = balance.balance > 0 ? successColor : theme.colors.error;

    return (
        <ScrollView
            style={styles.container}
        >
            <List.Item
                title={account.name}
                description={account.description}
            />
            <List.Item
                title="Balance"
                right={props => <Text
                    style={{ color: textColor }}>{balance.balance.toFixed(2)} {activeGroup.currency_symbol}</Text>}
            />
            {account.type === "clearing" && (
                <>
                    <TransactionShareInput
                        title="Participated"
                        disabled={true}
                        groupID={groupID}
                        value={account.clearing_shares}
                        onChange={() => {
                        }}
                        enableAdvanced={true}
                        multiSelect={true}
                        excludedAccounts={[account.id]}
                    />
                </>
            )}

            {accountTransactions.length > 0 && (
                <>
                    <Divider />
                    <List.Section>
                        <List.Subheader>{account.type === "clearing" ? "Cleared" : "Participated in"}</List.Subheader>
                        {accountTransactions.map(t => renderTransactionListEntry(t))}
                    </List.Section>
                </>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 6,
    },
    input: {
        marginBottom: 4,
    },
    shareContainer: {
        padding: 16,
        borderBottomStyle: "solid",
        borderBottomColor: "#bebebe",
        borderBottomWidth: 1,
        borderTopRightRadius: 4,
        borderTopLeftRadius: 4,
        backgroundColor: "#1e1e1e",
    },
});
