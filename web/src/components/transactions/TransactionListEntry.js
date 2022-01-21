import ListItemLink from "../style/ListItemLink";
import { Chip, ListItemAvatar, ListItemText, Tooltip, Typography } from "@mui/material";
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
        <ListItemLink to={`/groups/${group.id}/transactions/${transaction.id}`}>
            <ListItemAvatar>
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
                        <span>
                            {transaction.value.toFixed(2)} {transaction.currency_symbol} -{" "}
                        </span>
                        <span>by {accountNamesFromShares(Object.keys(transaction.creditor_shares))}, </span>
                        <span>for {accountNamesFromShares(Object.keys(transaction.debitor_shares))}</span>
                    </>
                }
            />
            <ListItemText>
                <Typography align="right" variant="body2">
                    {DateTime.fromISO(transaction.billed_at).toLocaleString(DateTime.DATE_FULL)}
                </Typography>
            </ListItemText>
        </ListItemLink>
    );
}
