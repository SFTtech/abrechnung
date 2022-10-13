import { useRecoilValue } from "recoil";
import { accountBalances } from "../../state/transactions";
import ListItemLink from "../style/ListItemLink";
import { ListItemAvatar, ListItemText, Tooltip, Typography } from "@mui/material";
import { DateTime } from "luxon";
import React from "react";
import { balanceColor } from "../../core/utils";
import { ClearingAccountIcon } from "../style/AbrechnungIcons";
import { Group } from "../../state/groups";
import { AccountConsolidated } from "../../state/accounts";

interface Props {
    group: Group;
    account: AccountConsolidated;
    accountID: number;
}

export const AccountClearingListEntry: React.FC<Props> = ({ group, account, accountID }) => {
    const balances = useRecoilValue(accountBalances(group.id));

    return (
        <ListItemLink to={`/groups/${group.id}/accounts/${account.id}`}>
            <ListItemAvatar sx={{ minWidth: { xs: "40px", md: "56px" } }}>
                <Tooltip title="Clearing Account">
                    <ClearingAccountIcon color="primary" />
                </Tooltip>
            </ListItemAvatar>
            <ListItemText
                primary={
                    <Typography variant="body1" component="span">
                        {account.name}
                    </Typography>
                }
                secondary={account.description}
            />
            <ListItemText>
                <Typography align="right" variant="body2">
                    <Typography
                        component="span"
                        sx={{
                            color: (theme) => balanceColor(balances[account.id].clearingResolution[accountID], theme),
                        }}
                    >
                        {balances[account.id].clearingResolution[accountID].toFixed(2)} {group.currency_symbol}
                    </Typography>
                    <br />
                    <Typography component="span" sx={{ typography: "body2", color: "text.secondary" }}>
                        last changed: {DateTime.fromISO(account.last_changed).toLocaleString(DateTime.DATETIME_FULL)}
                    </Typography>
                </Typography>
            </ListItemText>
        </ListItemLink>
    );
};

export default AccountClearingListEntry;
