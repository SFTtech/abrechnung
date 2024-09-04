import { selectTransactionBalanceEffect, useGroupCurrencySymbol } from "@abrechnung/redux";
import { HelpOutline } from "@mui/icons-material";
import { Chip, ListItemAvatar, ListItemText, Tooltip, Typography } from "@mui/material";
import { DateTime } from "luxon";
import React from "react";
import { balanceColor } from "@/core/utils";
import { useAppSelector } from "@/store";
import { ListItemLink, PurchaseIcon, TransferIcon } from "../style";
import { useTranslation } from "react-i18next";
import { Transaction } from "@abrechnung/types";

interface Props {
    groupId: number;
    transaction: Transaction;
    accountId: number;
}

export const AccountTransactionListEntry: React.FC<Props> = ({ groupId, transaction, accountId }) => {
    const { t } = useTranslation();
    const balanceEffect = useAppSelector((state) => selectTransactionBalanceEffect(state, groupId, transaction.id));
    const currency_symbol = useGroupCurrencySymbol(groupId);

    return (
        <ListItemLink to={`/groups/${groupId}/transactions/${transaction.id}`}>
            <ListItemAvatar sx={{ minWidth: { xs: "40px", md: "56px" } }}>
                {transaction.type === "purchase" ? (
                    <Tooltip title={t("transactions.purchase")}>
                        <PurchaseIcon color="primary" />
                    </Tooltip>
                ) : transaction.type === "transfer" ? (
                    <Tooltip title={t("transactions.transfer")}>
                        <TransferIcon color="primary" />
                    </Tooltip>
                ) : (
                    <Tooltip title="Unknown Transaction Type">
                        <HelpOutline color="primary" />
                    </Tooltip>
                )}
            </ListItemAvatar>
            <ListItemText
                primary={
                    <>
                        {transaction.is_wip && (
                            <Chip color="info" variant="outlined" label="WIP" size="small" sx={{ mr: 1 }} />
                        )}
                        <Typography variant="body1" component="span">
                            {transaction.name}
                        </Typography>
                    </>
                }
                secondary={DateTime.fromISO(transaction.billed_at).toLocaleString(DateTime.DATE_FULL)}
            />
            <ListItemText>
                <Typography align="right" variant="body2">
                    <Typography
                        component="span"
                        sx={{
                            color: (theme) => balanceColor(balanceEffect[accountId].total, theme),
                        }}
                    >
                        {balanceEffect[accountId].total.toFixed(2)} {currency_symbol}
                    </Typography>
                    <br />
                    <Typography component="span" sx={{ typography: "body2", color: "text.secondary" }}>
                        {t("common.lastChangedWithTime", "", {
                            datetime: DateTime.fromISO(transaction.last_changed).toLocaleString(DateTime.DATETIME_FULL),
                        })}
                    </Typography>
                </Typography>
            </ListItemText>
        </ListItemLink>
    );
};
