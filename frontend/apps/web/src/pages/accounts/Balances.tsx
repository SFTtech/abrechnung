import { GroupArchivedDisclaimer } from "@/components";
import { BalanceTable } from "@/components/accounts/BalanceTable";
import { ListItemLink, MobilePaper } from "@/components/style";
import { useTitle } from "@/core/utils";
import { useFormatCurrency, useIsSmallScreen } from "@/hooks";
import { useAppSelector } from "@/store";
import {
    selectAccountBalances,
    useGroup,
    useGroupAccounts,
    useIsGroupWritable,
    useSortedAccounts,
} from "@abrechnung/redux";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Alert, AlertTitle, Box, Button, Divider, List, ListItemText, Tab, Theme, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, Link as RouterLink } from "react-router";
import { BalanceBarGraph } from "./BalanceBarGraph";

interface Props {
    groupId: number;
}

export const Balances: React.FC<Props> = ({ groupId }) => {
    const { t } = useTranslation();
    const formatCurrency = useFormatCurrency();
    const theme: Theme = useTheme();
    const isSmallScreen = useIsSmallScreen();

    const group = useGroup(groupId);
    const personalAccounts = useSortedAccounts(groupId, "name", "personal");
    const clearingAccounts = useGroupAccounts(groupId, "clearing");
    const balances = useAppSelector((state) => selectAccountBalances(state, groupId));
    const isGroupWritable = useIsGroupWritable(groupId);

    const [selectedTab, setSelectedTab] = useState("1");

    const colorGreenInverted = theme.palette.mode === "dark" ? theme.palette.success.light : theme.palette.success.dark;
    const colorRedInverted = theme.palette.mode === "dark" ? theme.palette.error.light : theme.palette.error.dark;

    useTitle(t("accounts.balances.tabTitle", "", { groupName: group?.name }));

    if (!group) {
        return <Navigate to="/404" />;
    }

    const unbalancedClearingAccounts = clearingAccounts
        .filter((account) => balances[account.id]?.balance !== 0)
        .map((account) => {
            return {
                name: account.name,
                id: account.id,
                balance: balances[account.id]?.balance ?? 0,
            };
        });

    return (
        <MobilePaper>
            <GroupArchivedDisclaimer group={group} />
            <TabContext value={selectedTab}>
                <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                    <TabList onChange={(event, idx) => setSelectedTab(idx)} centered>
                        <Tab label="Chart" value="1" />
                        <Tab label="Table" value="2" />
                    </TabList>
                </Box>
                <TabPanel value="1" sx={{ padding: { xs: 1, md: 2 } }}>
                    {personalAccounts.length === 0 && <Alert severity="info">{t("accounts.noAccounts")}</Alert>}
                    {unbalancedClearingAccounts.length !== 0 && (
                        <Alert severity="info">
                            <AlertTitle>{t("accounts.balances.clearingAccountsRemainingBalances")}</AlertTitle>
                            {unbalancedClearingAccounts.map((account) => (
                                <Typography variant="body2" key={account.id} component="span">
                                    <>{account.name}:</>
                                    <Typography
                                        variant="body2"
                                        component="span"
                                        sx={{
                                            color: account.balance < 0 ? colorRedInverted : colorGreenInverted,
                                        }}
                                    >
                                        {formatCurrency(account.balance, group.currency_symbol)}
                                    </Typography>
                                </Typography>
                            ))}
                        </Alert>
                    )}
                    {isSmallScreen ? (
                        <List>
                            {personalAccounts.map((account) => (
                                <div key={account.id}>
                                    <ListItemLink to={`/groups/${group.id}/accounts/${account.id}`}>
                                        <ListItemText primary={account.name} />
                                        <Typography
                                            align="right"
                                            variant="body2"
                                            sx={{
                                                color:
                                                    balances[account.id]?.balance < 0
                                                        ? colorRedInverted
                                                        : colorGreenInverted,
                                            }}
                                        >
                                            {formatCurrency(balances[account.id]?.balance, group.currency_symbol)}
                                        </Typography>
                                    </ListItemLink>
                                    <Divider component="li" />
                                </div>
                            ))}
                        </List>
                    ) : (
                        <BalanceBarGraph group={group} />
                    )}
                </TabPanel>
                <TabPanel value="2" sx={{ padding: { xs: 1, md: 2 } }}>
                    <BalanceTable group={group} />
                </TabPanel>
            </TabContext>
            {isGroupWritable && (
                <>
                    <Divider />
                    <Box sx={{ display: "flex", justifyContent: "center" }}>
                        <Button component={RouterLink} to={`/groups/${group.id}/settlement-plan`}>
                            {t("accounts.settleUp")}
                        </Button>
                    </Box>
                </>
            )}
        </MobilePaper>
    );
};
