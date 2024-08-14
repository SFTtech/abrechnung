import { selectAccountBalances, selectGroupCurrencySymbol } from "@abrechnung/redux";
import { Box, ListItemAvatar, ListItemText, Tooltip, Typography } from "@mui/material";
import { DateTime } from "luxon";
import React from "react";
import { balanceColor } from "@/core/utils";
import { selectGroupSlice, useAppSelector } from "@/store";
import { getAccountLink } from "@/utils";
import { ClearingAccountIcon } from "../style/AbrechnungIcons";
import ListItemLink from "../style/ListItemLink";
import { useTranslation } from "react-i18next";
import { useFormatCurrency } from "@/hooks";
import { ClearingAccount } from "@abrechnung/types";

interface Props {
    groupId: number;
    accountId: number;
    clearingAccount: ClearingAccount;
}

export const AccountClearingListEntry: React.FC<Props> = ({ groupId, accountId, clearingAccount }) => {
    const { t } = useTranslation();
    const formatCurrency = useFormatCurrency();
    const balances = useAppSelector((state) => selectAccountBalances({ state, groupId }));
    const currency_symbol = useAppSelector((state) =>
        selectGroupCurrencySymbol({ state: selectGroupSlice(state), groupId })
    );
    if (!currency_symbol) {
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
                        {formatCurrency(balances[clearingAccount.id]?.clearingResolution[accountId], currency_symbol)}
                    </Typography>
                    <br />
                    <Typography component="span" sx={{ typography: "body2", color: "text.secondary" }}>
                        {t("common.lastChangedWithTime", "", {
                            datetime: DateTime.fromISO(clearingAccount.last_changed).toLocaleString(
                                DateTime.DATETIME_FULL
                            ),
                        })}
                    </Typography>
                </Typography>
            </ListItemText>
        </ListItemLink>
    );
};
