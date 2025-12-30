import { selectAccountBalances, useGroupCurrencyIdentifier } from "@abrechnung/redux";
import { Divider, ListItemAvatar, ListItemText, Stack, Tooltip, Typography } from "@mui/material";
import React from "react";
import { balanceColor } from "@/core/utils";
import { useAppSelector } from "@/store";
import { getAccountLink } from "@/utils";
import { ListItemLink, ClearingAccountIcon } from "@/components/style";
import { useFormatCurrency, useFormatDatetime } from "@/hooks";
import { ClearingAccount } from "@abrechnung/types";
import { ClearingAccountParticipants } from "@/components/accounts";

interface Props {
    groupId: number;
    accountId: number;
    clearingAccount: ClearingAccount;
}

export const AccountClearingListEntry: React.FC<Props> = ({ groupId, accountId, clearingAccount }) => {
    const formatCurrency = useFormatCurrency();
    const formatDatetime = useFormatDatetime();
    const balances = useAppSelector((state) => selectAccountBalances(state, groupId));
    const currencyIdentifier = useGroupCurrencyIdentifier(groupId);
    if (!currencyIdentifier) {
        return null;
    }

    return (
        <>
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
                        <Stack>
                            <div>
                                <Typography variant="body2" component="span" sx={{ color: "text.primary" }}>
                                    <ClearingAccountParticipants groupId={groupId} account={clearingAccount} />
                                </Typography>
                            </div>

                            {clearingAccount.date_info != null && (
                                <div>
                                    <span>{formatDatetime(clearingAccount.date_info, "date")}</span>
                                </div>
                            )}
                        </Stack>
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
                            {formatCurrency(
                                balances[clearingAccount.id]?.clearingResolution[accountId],
                                currencyIdentifier
                            )}
                        </Typography>
                    </Typography>
                </ListItemText>
            </ListItemLink>
            <Divider sx={{ display: { lg: "none" } }} component="li" />
        </>
    );
};
