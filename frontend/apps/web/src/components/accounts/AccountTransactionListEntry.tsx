import ListItemLink from "../style/ListItemLink";
import { Chip, ListItemAvatar, ListItemText, Tooltip, Typography } from "@mui/material";
import { HelpOutline } from "@mui/icons-material";
import { DateTime } from "luxon";
import React from "react";
import { balanceColor } from "../../core/utils";
import { PurchaseIcon, TransferIcon } from "../style/AbrechnungIcons";
import { selectGroupSlice, selectTransactionSlice, useAppSelector } from "../../store";
import { selectGroupCurrencySymbol, selectTransactionBalanceEffect, selectTransactionById } from "@abrechnung/redux";

interface Props {
    groupId: number;
    transactionId: number;
    accountId: number;
}

export const AccountTransactionListEntry: React.FC<Props> = ({ groupId, transactionId, accountId }) => {
    const balanceEffect = useAppSelector((state) =>
        selectTransactionBalanceEffect({ state: selectTransactionSlice(state), groupId, transactionId })
    );
    const transaction = useAppSelector((state) =>
        selectTransactionById({ state: selectTransactionSlice(state), groupId, transactionId })
    );
    const currencySymbol = useAppSelector((state) =>
        selectGroupCurrencySymbol({ state: selectGroupSlice(state), groupId })
    );

    return (
        <ListItemLink to={`/groups/${groupId}/transactions/${transaction.id}`}>
            <ListItemAvatar sx={{ minWidth: { xs: "40px", md: "56px" } }}>
                {transaction.type === "purchase" ? (
                    <Tooltip title="Purchase">
                        <PurchaseIcon color="primary" />
                    </Tooltip>
                ) : transaction.type === "transfer" ? (
                    <Tooltip title="Money Transfer">
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
                        {transaction.isWip && (
                            <Chip color="info" variant="outlined" label="WIP" size="small" sx={{ mr: 3 }} />
                        )}
                        <Typography variant="body1" component="span">
                            {transaction.description}
                        </Typography>
                    </>
                }
                secondary={DateTime.fromISO(transaction.billedAt).toLocaleString(DateTime.DATE_FULL)}
            />
            <ListItemText>
                <Typography align="right" variant="body2">
                    <Typography
                        component="span"
                        sx={{
                            color: (theme) => balanceColor(balanceEffect[accountId].total, theme),
                        }}
                    >
                        {balanceEffect[accountId].total.toFixed(2)} {currencySymbol}
                    </Typography>
                    <br />
                    <Typography component="span" sx={{ typography: "body2", color: "text.secondary" }}>
                        last changed: {DateTime.fromISO(transaction.lastChanged).toLocaleString(DateTime.DATETIME_FULL)}
                    </Typography>
                </Typography>
            </ListItemText>
        </ListItemLink>
    );
};

export default AccountTransactionListEntry;
