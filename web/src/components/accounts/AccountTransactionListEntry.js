import { useRecoilValue } from "recoil";
import { accountsSeenByUser } from "../../recoil/accounts";
import ListItemLink from "../style/ListItemLink";
import { Chip, ListItemAvatar, ListItemText, Tooltip, Typography } from "@mui/material";
import { HelpOutline } from "@mui/icons-material";
import { DateTime } from "luxon";
import React from "react";
import { balanceColor } from "../../utils";
import { PurchaseIcon, TransferIcon } from "../style/AbrechnungIcons";

export default function AccountTransactionListEntry({ group, transaction, accountID }) {
    const accounts = useRecoilValue(accountsSeenByUser(group.id));

    return (
        <ListItemLink to={`/groups/${group.id}/transactions/${transaction.id}`}>
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
                        {transaction.is_wip && (
                            <Chip color="info" variant="outlined" label="WIP" size="small" sx={{ mr: 3 }} />
                        )}
                        <Typography variant="body1" component="span">
                            {transaction.description}
                        </Typography>
                    </>
                }
                secondary={DateTime.fromISO(transaction.billed_at).toLocaleString(DateTime.DATE_FULL)}
            />
            <ListItemText>
                <Typography align="right" variant="body2">
                    <Typography
                        component="span"
                        sx={{ color: (theme) => balanceColor(transaction.account_balances[accountID].total, theme) }}
                    >
                        {transaction.account_balances[accountID].total.toFixed(2)} {group.currency_symbol}
                    </Typography>
                    <br />
                    <Typography component="span" sx={{ typography: "body2", color: "text.secondary" }}>
                        last changed:{" "}
                        {DateTime.fromISO(transaction.last_changed).toLocaleString(DateTime.DATETIME_FULL)}
                    </Typography>
                </Typography>
            </ListItemText>
        </ListItemLink>
    );
}
