import { selectAccountBalances, selectAccountById, selectGroupCurrencySymbol } from "@abrechnung/redux";
import { Box, ListItemAvatar, ListItemText, Tooltip, Typography } from "@mui/material";
import { DateTime } from "luxon";
import React from "react";
import { balanceColor } from "../../core/utils";
import { selectAccountSlice, selectGroupSlice, useAppSelector } from "../../store";
import { getAccountLink } from "../../utils";
import { ClearingAccountIcon } from "../style/AbrechnungIcons";
import ListItemLink from "../style/ListItemLink";

interface Props {
    groupId: number;
    accountId: number;
    clearingAccountId: number;
}

export const AccountClearingListEntry: React.FC<Props> = ({ groupId, accountId, clearingAccountId }) => {
    const balances = useAppSelector((state) => selectAccountBalances({ state, groupId }));
    const currency_symbol = useAppSelector((state) =>
        selectGroupCurrencySymbol({ state: selectGroupSlice(state), groupId })
    );
    const clearingAccount = useAppSelector((state) =>
        selectAccountById({ state: selectAccountSlice(state), groupId, accountId: clearingAccountId })
    );
    if (clearingAccount.type !== "clearing") {
        console.error("expected a clearing account but received a personal account");
        return null;
    }

    return (
        <ListItemLink to={getAccountLink(groupId, clearingAccount.type, clearingAccount.id)}>
            <ListItemAvatar sx={{ minWidth: { xs: "40px", md: "56px" } }}>
                <Tooltip title="Clearing Account">
                    <ClearingAccountIcon color="primary" />
                </Tooltip>
            </ListItemAvatar>
            <ListItemText
                primary={
                    <Typography variant="body1" component="span">
                        {clearingAccount.name}
                    </Typography>
                }
                secondary={
                    <Box sx={{ display: "flex", flexDirection: "column" }}>
                        <span>{clearingAccount.description}</span>
                        {clearingAccount.date_info != null && <span>{clearingAccount.date_info}</span>}
                    </Box>
                }
            />
            <ListItemText>
                <Typography align="right" variant="body2">
                    <Typography
                        component="span"
                        sx={{
                            color: (theme) =>
                                balanceColor(balances[clearingAccount.id]?.clearingResolution[accountId], theme),
                        }}
                    >
                        {balances[clearingAccount.id]?.clearingResolution[accountId]?.toFixed(2)} {currency_symbol}
                    </Typography>
                    <br />
                    <Typography component="span" sx={{ typography: "body2", color: "text.secondary" }}>
                        last changed:{" "}
                        {DateTime.fromISO(clearingAccount.last_changed).toLocaleString(DateTime.DATETIME_FULL)}
                    </Typography>
                </Typography>
            </ListItemText>
        </ListItemLink>
    );
};

export default AccountClearingListEntry;
