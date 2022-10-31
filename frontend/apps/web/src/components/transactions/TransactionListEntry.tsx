import ListItemLink from "../style/ListItemLink";
import { Chip, Divider, ListItemAvatar, ListItemText, Tooltip, Typography } from "@mui/material";
import { HelpOutline } from "@mui/icons-material";
import { DateTime } from "luxon";
import React from "react";
import { useRecoilValue } from "recoil";
import { accountsSeenByUser } from "../../state/accounts";
import { PurchaseIcon, TransferIcon } from "../style/AbrechnungIcons";
import { Group, Transaction } from "@abrechnung/types";

interface Props {
    group: Group;
    transaction: Transaction;
}

export const TransactionListEntry: React.FC<Props> = ({ group, transaction }) => {
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
                            {transaction.hasUnpublishedChanges && (
                                <Chip color="info" variant="outlined" label="WIP" size="small" sx={{ mr: 1 }} />
                            )}
                            <Typography variant="body1" component="span">
                                {transaction.description}
                            </Typography>
                        </>
                    }
                    secondary={
                        <>
                            <Typography variant="body2" component="span" sx={{ color: "text.primary" }}>
                                by {accountNamesFromShares(Object.keys(transaction.creditorShares))}, for{" "}
                                {accountNamesFromShares(Object.keys(transaction.debitorShares))}
                            </Typography>
                            <br />
                            {DateTime.fromJSDate(transaction.billedAt).toLocaleString(DateTime.DATE_FULL)}
                        </>
                    }
                />
                <ListItemText>
                    <Typography align="right" variant="body2">
                        {transaction.value.toFixed(2)} {transaction.currencySymbol}
                        <br />
                        <Typography component="span" sx={{ typography: "body2", color: "text.secondary" }}>
                            last changed:{" "}
                            {DateTime.fromJSDate(transaction.lastChanged).toLocaleString(DateTime.DATETIME_FULL)}
                        </Typography>
                    </Typography>
                </ListItemText>
            </ListItemLink>
            <Divider sx={{ display: { lg: "none" } }} component="li" />
        </>
    );
};

export default TransactionListEntry;
