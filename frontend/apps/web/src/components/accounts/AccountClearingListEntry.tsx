import { selectAccountBalances, useGroupCurrencySymbol } from "@abrechnung/redux";
import { Box, Divider, ListItemAvatar, ListItemText, Tooltip, Typography } from "@mui/material";
import React from "react";
import { balanceColor } from "@/core/utils";
import { useAppSelector } from "@/store";
import { getAccountLink } from "@/utils";
import { ListItemLink, ClearingAccountIcon } from "../style";
import { useTranslation } from "react-i18next";
import { useFormatCurrency, useFormatDatetime, useIsSmallScreen } from "@/hooks";
import { ClearingAccount } from "@abrechnung/types";

interface Props {
    groupId: number;
    accountId: number;
    clearingAccount: ClearingAccount;
}

export const AccountClearingListEntry: React.FC<Props> = ({ groupId, accountId, clearingAccount }) => {
    const { t } = useTranslation();
    const formatCurrency = useFormatCurrency();
    const formatDatetime = useFormatDatetime();
    const balances = useAppSelector((state) => selectAccountBalances(state, groupId));
    const currencySymbol = useGroupCurrencySymbol(groupId);
    const isSmallScreen = useIsSmallScreen();
    if (!currencySymbol) {
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
                        <Box component="span" display="flex" flexDirection="column">
                            <span>{clearingAccount.description}</span>
                            {clearingAccount.date_info != null && (
                                <span>{formatDatetime(clearingAccount.date_info, "date")}</span>
                            )}
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
                            {formatCurrency(
                                balances[clearingAccount.id]?.clearingResolution[accountId],
                                currencySymbol
                            )}
                        </Typography>
                        {!isSmallScreen && (
                            <>
                                <br />
                                <Typography component="span" sx={{ typography: "body2", color: "text.secondary" }}>
                                    {t("common.lastChangedWithTime", {
                                        datetime: formatDatetime(clearingAccount.last_changed, "full"),
                                    })}
                                </Typography>
                            </>
                        )}
                    </Typography>
                </ListItemText>
            </ListItemLink>
            <Divider sx={{ display: { lg: "none" } }} component="li" />
        </>
    );
};
