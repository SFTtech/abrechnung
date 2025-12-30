import {
    createTransaction,
    selectTransactionsInvolvingAccount,
    useClearingAccountsInvolvingAccount,
} from "@abrechnung/redux";
import { Add as AddIcon } from "@mui/icons-material";
import { Account, ClearingAccount, Transaction, TransactionType } from "@abrechnung/types";
import { Alert, Box, IconButton, List, Tooltip, Typography } from "@mui/material";
import { DateTime } from "luxon";
import * as React from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import { AccountClearingListEntry } from "./AccountClearingListEntry";
import { AccountTransactionListEntry } from "./AccountTransactionListEntry";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useNavigate } from "react-router";
import { PurchaseIcon, TransferIcon } from "../../../components/style/AbrechnungIcons";

type ArrayAccountsAndTransactions = Array<Transaction | ClearingAccount>;

interface Props {
    groupId: number;
    account: Account;
}

const getDate = (entry: Transaction | ClearingAccount) => {
    if (entry.type === "clearing") {
        return entry.date_info;
    }

    return entry.billed_at;
};

export const AccountTransactionList: React.FC<Props> = ({ groupId, account }) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const transactions = useAppSelector((state) => selectTransactionsInvolvingAccount(state, groupId, account.id));
    const clearingAccounts = useClearingAccountsInvolvingAccount(groupId, account.id);

    const combinedList: ArrayAccountsAndTransactions = (transactions as ArrayAccountsAndTransactions)
        .concat(clearingAccounts)
        .sort((f1, f2) => DateTime.fromISO(getDate(f2)).toMillis() - DateTime.fromISO(getDate(f1)).toMillis());

    const createTransactionForAccount = (type: TransactionType) => {
        dispatch(
            createTransaction({
                groupId,
                type,
                data: {
                    debitor_shares: {
                        [account.id]: 1,
                    },
                },
            })
        )
            .unwrap()
            .then(({ transaction }) => {
                navigate(`/groups/${groupId}/transactions/${transaction.id}?no-redirect=true`);
            })
            .catch(() => toast.error("Creating a transaction failed"));
    };

    return (
        <>
            <Box display="grid" gridTemplateColumns="auto min-content" justifyContent="space-between">
                <Typography variant="h6">{t("accounts.transactionsInvolving", "", { account })}</Typography>
                <Box display="flex" flexDirection="row" alignItems="center">
                    <AddIcon color="primary" />
                    <Tooltip
                        title={t("transactions.createPurchaseForAccount", "", {
                            accountName: account.name,
                        })}
                    >
                        <IconButton color="primary" onClick={() => createTransactionForAccount("purchase")}>
                            <PurchaseIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip
                        title={t("transactions.createTransferForAccount", "", {
                            accountName: account.name,
                        })}
                    >
                        <IconButton color="primary" onClick={() => createTransactionForAccount("transfer")}>
                            <TransferIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>
            <List>
                {combinedList.length === 0 && <Alert severity="info">{t("common.noneSoFar")}</Alert>}
                {combinedList.map((entry) => {
                    if (entry.type === "clearing") {
                        return (
                            <AccountClearingListEntry
                                key={`clearing-${entry.id}`}
                                accountId={account.id}
                                groupId={groupId}
                                clearingAccount={entry}
                            />
                        );
                    }

                    return (
                        <AccountTransactionListEntry
                            key={`transaction-${entry.id}`}
                            accountId={account.id}
                            groupId={groupId}
                            transaction={entry}
                        />
                    );
                })}
            </List>
        </>
    );
};
