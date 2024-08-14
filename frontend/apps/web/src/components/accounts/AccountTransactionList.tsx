import {
    createTransaction,
    selectClearingAccountsInvolvingAccounts,
    selectTransactionsInvolvingAccount,
} from "@abrechnung/redux";
import { Add as AddIcon } from "@mui/icons-material";
import { Account, Transaction } from "@abrechnung/types";
import { Alert, Box, IconButton, List, Tooltip, Typography } from "@mui/material";
import { DateTime } from "luxon";
import * as React from "react";
import { selectAccountSlice, selectTransactionSlice, useAppDispatch, useAppSelector } from "@/store";
import { AccountClearingListEntry } from "./AccountClearingListEntry";
import { AccountTransactionListEntry } from "./AccountTransactionListEntry";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { PurchaseIcon } from "../style/AbrechnungIcons";

type ArrayAccountsAndTransactions = Array<Transaction | Account>;

interface Props {
    groupId: number;
    account: Account;
}

export const AccountTransactionList: React.FC<Props> = ({ groupId, account }) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const transactions = useAppSelector((state) =>
        selectTransactionsInvolvingAccount({ state: selectTransactionSlice(state), groupId, accountId: account.id })
    );
    const clearingAccounts = useAppSelector((state) =>
        selectClearingAccountsInvolvingAccounts({ state: selectAccountSlice(state), groupId, accountId: account.id })
    );

    const combinedList: ArrayAccountsAndTransactions = (transactions as ArrayAccountsAndTransactions)
        .concat(clearingAccounts)
        .sort((f1, f2) => DateTime.fromISO(f2.last_changed).toMillis() - DateTime.fromISO(f1.last_changed).toMillis());

    const createTransactionForAccount = () => {
        dispatch(
            createTransaction({
                groupId,
                type: "purchase",
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
            <Box sx={{ display: "grid", gridTemplateColumns: "auto min-content", justifyContent: "space-between" }}>
                <Typography variant="h6">{t("accounts.transactionsInvolving", "", { account })}</Typography>
                <Tooltip
                    title={t("transactions.createPurchaseForAccount", "", {
                        accountName: account.name,
                    })}
                >
                    <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
                        <AddIcon color="primary" />
                        <IconButton color="primary" onClick={createTransactionForAccount}>
                            <PurchaseIcon />
                        </IconButton>
                    </Box>
                </Tooltip>
            </Box>
            <List>
                {combinedList.length === 0 && <Alert severity="info">None so far.</Alert>}
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
                    if (entry.type === "personal") {
                        return null;
                    }

                    // we need to case "entry" to Transaction as typescript cant deduce that it
                    // has to be a transaction even though we handled all other "type" cases before
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
