import ListItemLink from "../style/ListItemLink";
import { Chip, Divider, ListItemAvatar, ListItemText, Tooltip, Typography } from "@mui/material";
import { CompareArrows, HelpOutline, ShoppingCart } from "@mui/icons-material";
import { DateTime } from "luxon";
import React from "react";
import { makeStyles } from "@mui/styles";
import { useRecoilValue } from "recoil";
import { accountsSeenByUser } from "../../recoil/accounts";

const useStyles = makeStyles((theme) => ({
    propertyPill: {
        marginRight: "3px",
    },
}));

export function TransactionListEntry({ group, transaction }) {
    const classes = useStyles();

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
                            <ShoppingCart color="primary" />
                        </Tooltip>
                    ) : transaction.type === "transfer" ? (
                        <Tooltip title="Money Transfer">
                            <CompareArrows color="primary" />
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
                                <Chip
                                    color="info"
                                    variant="outlined"
                                    label="WIP"
                                    size="small"
                                    className={classes.propertyPill}
                                />
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
                    </Typography>
                </ListItemText>
            </ListItemLink>
            <Divider sx={{ display: { lg: "none" } }} component="li" />
        </>
    );
}
