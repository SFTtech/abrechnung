import { GroupStackScreenProps } from "../../navigation/types";
import { ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Divider, List, Text, useTheme } from "react-native-paper";
import * as React from "react";
import { useLayoutEffect } from "react";
import { useRecoilValue } from "recoil";
import { accountBalancesState, accountByIDState } from "../../core/accounts";
import { toISODateString } from "@abrechnung/utils";
import { TransactionDetails, AccountBalance } from "@abrechnung/types";
import { getTransactionIcon } from "../../constants/Icons";
import TransactionShareInput from "../../components/transaction_shares/TransactionShareInput";
import { successColor } from "../../theme";
import { activeGroupState } from "../../core/groups";
import { transactionsInvolvingAccount } from "../../core/transactions";

export const AccountDetail: React.FC<GroupStackScreenProps<"AccountDetail">> = ({ route, navigation }) => {
    const theme = useTheme();

    const { groupID, accountID } = route.params;

    const activeGroup = useRecoilValue(activeGroupState);
    const account = useRecoilValue(accountByIDState({ groupID, accountID }));
    const accountBalances = useRecoilValue(accountBalancesState(groupID));
    const accountTransactions = useRecoilValue(transactionsInvolvingAccount({ groupID, accountID }));

    useLayoutEffect(() => {
        const edit = () => {
            navigation.navigate("AccountEdit", {
                accountID: accountID,
                groupID: groupID,
                editingStart: new Date().toISOString(),
            });
        };

        navigation.setOptions({
            headerTitle: account?.name || "",
            headerRight: () => {
                return <Button onPress={edit}>Edit</Button>;
            },
        });
    }, [accountID, groupID, theme, account, navigation]);

    const renderTransactionListEntry = (transaction: TransactionDetails) => (
        <List.Item
            key={transaction.id}
            title={transaction.description}
            description={toISODateString(transaction.billedAt)}
            left={(props) => <List.Icon {...props} icon={getTransactionIcon(transaction.type)} />}
            right={(props) => (
                <Text>
                    {transaction.value.toFixed(2)}
                    {transaction.currencySymbol}
                </Text>
            )}
            onPress={() =>
                navigation.navigate("TransactionDetail", {
                    groupID: transaction.groupID,
                    transactionID: transaction.id,
                    editingStart: null,
                })
            }
        />
    );

    if (account == null) {
        return (
            <View>
                <ActivityIndicator animating={true} />
            </View>
        );
    }

    const balance: AccountBalance | undefined = accountBalances.get(account.id);
    if (balance === undefined) {
        return null; // TODO: display some error
    }
    const textColor = balance.balance > 0 ? successColor : theme.colors.error;

    return (
        <ScrollView style={styles.container}>
            <List.Item title={account.name} description={account.description} />
            <List.Item
                title="Balance"
                right={(props) => (
                    <Text style={{ color: textColor }}>
                        {balance.balance.toFixed(2)} {activeGroup?.currencySymbol}
                    </Text>
                )}
            />
            {account.type === "clearing" && (
                <TransactionShareInput
                    title="Participated"
                    disabled={true}
                    groupID={groupID}
                    value={account.clearingShares}
                    onChange={() => {
                        return;
                    }}
                    enableAdvanced={true}
                    multiSelect={true}
                    excludedAccounts={[account.id]}
                />
            )}

            {accountTransactions.length > 0 && (
                <>
                    <Divider />
                    <List.Section>
                        <List.Subheader>{account.type === "clearing" ? "Cleared" : "Participated in"}</List.Subheader>
                        {accountTransactions.map((t) => renderTransactionListEntry(t))}
                    </List.Section>
                </>
            )}
        </ScrollView>
    );
};

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

export default AccountDetail;
