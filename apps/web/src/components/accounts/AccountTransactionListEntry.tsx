import { selectTransactionBalanceEffect, useGroupCurrencyIdentifier } from "@abrechnung/redux";
import { HelpOutline } from "@mui/icons-material";
import { Chip, Divider, ListItemAvatar, ListItemText, Tooltip, Typography } from "@mui/material";
import * as React from "react";
import { balanceColor } from "@/core/utils";
import { useAppSelector } from "@/store";
import { ListItemLink, PurchaseIcon, TransferIcon } from "../style";
import { useTranslation } from "react-i18next";
import { Transaction } from "@abrechnung/types";
import { useFormatCurrency, useFormatDatetime } from "@/hooks";

interface Props {
    groupId: number;
    transaction: Transaction;
    accountId: number;
}

export const AccountTransactionListEntry: React.FC<Props> = ({ groupId, transaction, accountId }) => {
    const { t } = useTranslation();
    const balanceEffect = useAppSelector((state) => selectTransactionBalanceEffect(state, groupId, transaction.id));
    const formatDatetime = useFormatDatetime();
    const formatCurrency = useFormatCurrency();
    const currencyIdentifier = useGroupCurrencyIdentifier(groupId);

    return (
        <>
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
                    secondary={formatDatetime(transaction.billed_at, "date")}
                />
                <ListItemText>
                    <Typography align="right" variant="body2">
                        <Typography
                            component="span"
                            sx={{
                                color: (theme) => balanceColor(balanceEffect[accountId].total, theme),
                            }}
                        >
                            {formatCurrency(balanceEffect[accountId].total, currencyIdentifier)}
                        </Typography>
                    </Typography>
                </ListItemText>
            </ListItemLink>
            <Divider sx={{ display: { lg: "none" } }} component="li" />
        </>
    );
};
