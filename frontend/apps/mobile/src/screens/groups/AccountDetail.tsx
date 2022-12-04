import { GroupStackScreenProps } from "../../navigation/types";
import { ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Chip, Divider, List, Text, useTheme } from "react-native-paper";
import * as React from "react";
import { useLayoutEffect } from "react";
import { Transaction, AccountBalance, Account, TransactionShare } from "@abrechnung/types";
import { clearingAccountIcon, getTransactionIcon } from "../../constants/Icons";
import TransactionShareInput from "../../components/transaction-shares/TransactionShareInput";
import { successColor } from "../../theme";
import { selectAccountSlice, selectGroupSlice, selectTransactionSlice, useAppSelector } from "../../store";
import {
    selectAccountBalances,
    selectAccountById,
    selectGroupCurrencySymbol,
    selectTransactionsInvolvingAccount,
    selectCurrentUserPermissions,
    selectClearingAccountsInvolvingAccounts,
    accountsUpdated,
} from "@abrechnung/redux";
import { fromISOString } from "@abrechnung/utils";

type ArrayAccountsAndTransactions = Array<Transaction | Account>;

export const AccountDetail: React.FC<GroupStackScreenProps<"AccountDetail">> = ({ route, navigation }) => {
    const theme = useTheme();

    const { groupId, accountId } = route.params;

    const account = useAppSelector((state) =>
        selectAccountById({ state: selectAccountSlice(state), groupId, accountId })
    );
    const accountBalances = useAppSelector((state) => selectAccountBalances({ state, groupId }));
    const transactions = useAppSelector((state) =>
        selectTransactionsInvolvingAccount({ state: selectTransactionSlice(state), groupId, accountId })
    );

    const clearingAccounts = useAppSelector((state) =>
        selectClearingAccountsInvolvingAccounts({ state: selectAccountSlice(state), groupId, accountId })
    );

    const combinedList: ArrayAccountsAndTransactions = (transactions as ArrayAccountsAndTransactions)
        .concat(clearingAccounts)
        .sort((f1, f2) => fromISOString(f2.lastChanged).getTime() - fromISOString(f1.lastChanged).getTime());

    const currencySymbol = useAppSelector((state) =>
        selectGroupCurrencySymbol({ state: selectGroupSlice(state), groupId })
    );
    const permissions = useAppSelector((state) => selectCurrentUserPermissions({ state: state, groupId }));

    useLayoutEffect(() => {
        const edit = () => {
            navigation.navigate("AccountEdit", {
                accountId: accountId,
                groupId: groupId,
            });
        };

        navigation.setOptions({
            headerTitle: account?.name || "",
            headerRight: () => {
                if (permissions === undefined || !permissions.canWrite) {
                    return null;
                }
                return <Button onPress={edit}>Edit</Button>;
            },
        });
    }, [accountId, permissions, groupId, theme, account, navigation]);

    const renderTransactionListEntryTransaction = (transaction: Transaction) => (
        <List.Item
            key={`transaction-${transaction.id}`}
            title={transaction.name}
            description={transaction.billedAt}
            left={(props) => <List.Icon {...props} icon={getTransactionIcon(transaction.type)} />}
            right={(props) => (
                <Text>
                    {transaction.value.toFixed(2)}
                    {transaction.currencySymbol}
                </Text>
            )}
            onPress={() =>
                navigation.navigate("TransactionDetail", {
                    groupId: transaction.groupID,
                    transactionId: transaction.id,
                    editing: false,
                })
            }
        />
    );

    const renderTransactionListEntryClearing = (account: Account) => (
        <List.Item
            key={`clearing-${account.id}`}
            title={account.name}
            description={account.description}
            left={(props) => <List.Icon {...props} icon={clearingAccountIcon} />}
            right={(props) => (
                <Text>
                    {accountBalances[account.id]?.clearingResolution[accountId]?.toFixed(2)}
                    {currencySymbol}
                </Text>
            )}
            onPress={() =>
                navigation.navigate("AccountDetail", {
                    groupId: account.groupID,
                    accountId: account.id,
                })
            }
        />
    );

    const renderTransactionListEntry = (element: Transaction | Account) => {
        if (element.type === "purchase" || element.type === "transfer" || element.type === "mimo") {
            return renderTransactionListEntryTransaction(element);
        } else if (element.type === "clearing") {
            return renderTransactionListEntryClearing(element);
        }
        return null;
    };

    if (account == null) {
        return (
            <View>
                <ActivityIndicator animating={true} />
            </View>
        );
    }

    const balance: AccountBalance | undefined = accountBalances[account.id];
    if (balance === undefined) {
        return null; // TODO: display some error
    }
    const textColor = balance.balance > 0 ? successColor : theme.colors.error;

    return (
        <ScrollView style={styles.container}>
            <List.Item title={account.name} description={account.description} />
            {account.type === "clearing" && (
                <>
                    {account.dateInfo != null && <List.Item title="Date" description={account.dateInfo} />}
                    {account.tags.length > 0 && (
                        <List.Item title="Tags" right={() => account.tags.map((tag) => <Chip key={tag}>{tag}</Chip>)} />
                    )}
                    <TransactionShareInput
                        title="Participated"
                        disabled={true}
                        groupId={groupId}
                        value={account.clearingShares as TransactionShare}
                        onChange={() => {
                            return;
                        }}
                        enableAdvanced={true}
                        multiSelect={true}
                        excludedAccounts={[account.id]}
                    />
                </>
            )}
            <List.Item
                title="Balance"
                right={(props) => (
                    <Text style={{ color: textColor }}>
                        {balance.balance.toFixed(2)} {currencySymbol}
                    </Text>
                )}
            />

            {combinedList.length > 0 ? (
                <>
                    <Divider />
                    <List.Section>
                        <List.Subheader>{account.type === "clearing" ? "Cleared" : "Participated in"}</List.Subheader>
                        {combinedList.map((t) => renderTransactionListEntry(t))}
                    </List.Section>
                </>
            ) : null}
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
