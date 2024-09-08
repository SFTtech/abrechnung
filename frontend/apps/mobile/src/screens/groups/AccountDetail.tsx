import {
    deleteAccount,
    selectAccountBalances,
    selectTransactionsInvolvingAccount,
    useAccount,
    useClearingAccountsInvolvingAccount,
    useGroupCurrencySymbol,
    useIsGroupWritable,
} from "@abrechnung/redux";
import { Account, AccountBalance, Transaction, TransactionShare } from "@abrechnung/types";
import { fromISOString } from "@abrechnung/utils";
import * as React from "react";
import { useLayoutEffect } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
    ActivityIndicator,
    Button,
    Dialog,
    Divider,
    IconButton,
    List,
    Portal,
    Text,
    useTheme,
} from "react-native-paper";
import TransactionShareInput from "../../components/transaction-shares/TransactionShareInput";
import { clearingAccountIcon, getTransactionIcon } from "../../constants/Icons";
import { useApi } from "../../core/ApiProvider";
import { GroupStackScreenProps } from "../../navigation/types";
import { notify } from "../../notifications";
import { useAppDispatch, useAppSelector } from "../../store";
import { successColor } from "../../theme";

type ArrayAccountsAndTransactions = Array<Transaction | Account>;

export const AccountDetail: React.FC<GroupStackScreenProps<"AccountDetail">> = ({ route, navigation }) => {
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const { api } = useApi();

    const { groupId, accountId } = route.params;

    const account = useAccount(groupId, accountId);
    const accountBalances = useAppSelector((state) => selectAccountBalances(state, groupId));
    const transactions = useAppSelector((state) => selectTransactionsInvolvingAccount(state, groupId, accountId));

    const clearingAccounts = useClearingAccountsInvolvingAccount(groupId, accountId);

    const combinedList: ArrayAccountsAndTransactions = (transactions as ArrayAccountsAndTransactions)
        .concat(clearingAccounts)
        .sort((f1, f2) => fromISOString(f2.last_changed).getTime() - fromISOString(f1.last_changed).getTime());

    const currency_symbol = useGroupCurrencySymbol(groupId);
    const isGroupWritable = useIsGroupWritable(groupId);

    const [confirmDeleteModalOpen, setConfirmDeleteModalOpen] = React.useState(false);

    const onDeleteAccount = React.useCallback(() => {
        dispatch(deleteAccount({ api, groupId, accountId }))
            .unwrap()
            .then(() => {
                navigation.pop();
            })
            .catch((err) => {
                notify({ text: `Error while deleting account: ${err.toString()}` });
            });
    }, [api, groupId, accountId, dispatch, navigation]);

    const closeConfirmDeleteModal = () => setConfirmDeleteModalOpen(false);
    const openConfirmDeleteModal = () => setConfirmDeleteModalOpen(true);

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
                if (!isGroupWritable) {
                    return null;
                }
                return (
                    <>
                        <Button onPress={edit}>Edit</Button>
                        <IconButton icon="delete" iconColor={theme.colors.error} onPress={openConfirmDeleteModal} />
                    </>
                );
            },
        });
    }, [accountId, isGroupWritable, groupId, theme, account, navigation]);

    const renderTransactionListEntryTransaction = (transaction: Transaction) => (
        <List.Item
            key={`transaction-${transaction.id}`}
            title={transaction.name}
            description={transaction.billed_at}
            left={(props) => <List.Icon {...props} icon={getTransactionIcon(transaction.type)} />}
            right={(props) => (
                <Text>
                    {transaction.value.toFixed(2)}
                    {transaction.currency_symbol}
                </Text>
            )}
            onPress={() =>
                navigation.navigate("TransactionDetail", {
                    groupId: transaction.group_id,
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
                    {currency_symbol}
                </Text>
            )}
            onPress={() =>
                navigation.navigate("AccountDetail", {
                    groupId: account.group_id,
                    accountId: account.id,
                })
            }
        />
    );

    const renderTransactionListEntry = (element: Transaction | Account) => {
        if (element.type === "purchase" || element.type === "transfer") {
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
                    {account.date_info != null && <List.Item title="Date" description={account.date_info} />}
                    {account.tags.length > 0 && (
                        <View style={{ paddingLeft: 16 }}>
                            <Text style={{ fontSize: theme.fonts.bodyLarge.fontSize }}>Tags</Text>
                            <View style={{ display: "flex", flexDirection: "row", flexWrap: "wrap" }}>
                                <Text>{account.tags.join(", ")}</Text>
                            </View>
                        </View>
                    )}
                    <TransactionShareInput
                        title="Participated"
                        disabled={true}
                        groupId={groupId}
                        value={account.clearing_shares as TransactionShare}
                        enableAdvanced={true}
                        multiSelect={true}
                        excludedAccounts={[account.id]}
                    />
                </>
            )}
            <List.Item
                title="Balance"
                right={() => (
                    <Text style={{ color: textColor }}>
                        {balance.balance.toFixed(2)} {currency_symbol}
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
            <Portal>
                <Dialog visible={confirmDeleteModalOpen} onDismiss={closeConfirmDeleteModal}>
                    <Dialog.Content>
                        <Text>
                            Do you really want to delete this {account.type === "clearing" ? "event" : "account"}?
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={closeConfirmDeleteModal}>No</Button>
                        <Button onPress={onDeleteAccount} textColor={theme.colors.error}>
                            Yes
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
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
        borderStyle: "solid",
        borderBottomColor: "#bebebe",
        borderBottomWidth: 1,
        borderTopRightRadius: 4,
        borderTopLeftRadius: 4,
        backgroundColor: "#1e1e1e",
    },
});

export default AccountDetail;
