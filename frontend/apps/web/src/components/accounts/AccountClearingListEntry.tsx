import ListItemLink from "../style/ListItemLink";
import { ListItemAvatar, ListItemText, Tooltip, Typography } from "@mui/material";
import { DateTime } from "luxon";
import React from "react";
import { balanceColor } from "../../core/utils";
import { ClearingAccountIcon } from "../style/AbrechnungIcons";
import { selectAccountById, selectGroupCurrencySymbol, selectAccountBalances } from "@abrechnung/redux";
import { useAppSelector, selectAccountSlice, selectGroupSlice } from "../../store";
import { getAccountLink } from "../../utils";

interface Props {
    groupId: number;
    accountId: number;
    clearingAccountId: number;
}

export const AccountClearingListEntry: React.FC<Props> = ({ groupId, accountId, clearingAccountId }) => {
    const balances = useAppSelector((state) => selectAccountBalances({ state, groupId }));
    const currencySymbol = useAppSelector((state) =>
        selectGroupCurrencySymbol({ state: selectGroupSlice(state), groupId })
    );
    const clearingAccount = useAppSelector((state) =>
        selectAccountById({ state: selectAccountSlice(state), groupId, accountId: clearingAccountId })
    );

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
                secondary={clearingAccount.description}
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
                        {balances[clearingAccount.id]?.clearingResolution[accountId]?.toFixed(2)} {currencySymbol}
                    </Typography>
                    <br />
                    <Typography component="span" sx={{ typography: "body2", color: "text.secondary" }}>
                        last changed:{" "}
                        {DateTime.fromISO(clearingAccount.lastChanged).toLocaleString(DateTime.DATETIME_FULL)}
                    </Typography>
                </Typography>
            </ListItemText>
        </ListItemLink>
    );
};

export default AccountClearingListEntry;
