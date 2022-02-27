import ListItemLink from "../style/ListItemLink";
import { Chip, Divider, ListItemAvatar, ListItemText, Tooltip, Typography } from "@mui/material";
import { CompareArrows, HelpOutline, ShoppingCart } from "@mui/icons-material";
import { DateTime } from "luxon";
import React from "react";
import { useRecoilValue } from "recoil";
import { accountsSeenByUser } from "../../recoil/accounts";
import { TransferIcon, PurchaseIcon } from "../style/AbrechnungIcons";

export function TransactionListEntry({ group, transaction }) {
    const accounts = useRecoilValue(accountsSeenByUser(group.id));
    const accountNamesFromShares = (shares) => {
        return shares.map((s) => accounts.find((a) => a.id === parseInt(s))?.name).join(", ");
    };

    return (
        <>
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
                    secondary={
                        <>
                            <Typography variant="body2" component="span" sx={{ color: "text.primary" }}>
                                by {accountNamesFromShares(Object.keys(transaction.creditor_shares))}, for{" "}
                                {accountNamesFromShares(Object.keys(transaction.debitor_shares))}
                            </Typography>
                            <br />
                            {DateTime.fromISO(transaction.billed_at).toLocaleString(DateTime.DATE_FULL)}
                        </>
                    }
                />
                <ListItemText>
                    <Typography align="right" variant="body2">
                        {transaction.value.toFixed(2)} {transaction.currency_symbol}
                        <br />
                        <Typography component="span" sx={{ typography: "body2", color: "text.secondary" }}>
                            last changed:{" "}
                            {DateTime.fromISO(transaction.last_changed).toLocaleString(DateTime.DATETIME_FULL)}
                        </Typography>
                    </Typography>
                </ListItemText>
            </ListItemLink>
            <Divider sx={{ display: { lg: "none" } }} component="li" />
        </>
    );
}
