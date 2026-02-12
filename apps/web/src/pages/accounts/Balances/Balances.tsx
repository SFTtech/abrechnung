import { GroupArchivedDisclaimer } from "@/components";
import { MobilePaper } from "@/components/style";
import { useTitle } from "@/core/utils";
import { useFormatCurrency, useGetAmountColor } from "@/hooks";
import { useAppSelector } from "@/store";
import {
    selectAccountBalances,
    useGroup,
    useGroupAccounts,
    useIsGroupWritable,
    useSortedAccounts,
} from "@abrechnung/redux";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Alert, AlertTitle, Box, Button, Divider, Tab, Typography } from "@mui/material";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, Link as RouterLink } from "react-router";
import { BalanceBarGraph } from "./BalanceBarGraph";
import { Statistics } from "./Statistics";

interface Props {
    groupId: number;
}

export const Balances: React.FC<Props> = ({ groupId }) => {
    const { t } = useTranslation();
    const formatCurrency = useFormatCurrency();

    const group = useGroup(groupId);
    const personalAccounts = useSortedAccounts(groupId, "name", "personal");
    const clearingAccounts = useGroupAccounts(groupId, "clearing");
    const balances = useAppSelector((state) => selectAccountBalances(state, groupId));
    const isGroupWritable = useIsGroupWritable(groupId);

    const [selectedTab, setSelectedTab] = useState("1");

    const getAmountColor = useGetAmountColor();

    useTitle(t("accounts.balances.tabTitle", { groupName: group?.name }));

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
                        <Tab label={t("accounts.balances.chartTabTitle")} value="1" />
                        <Tab label={t("accounts.balances.statisticsTabTitle")} value="2" />
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
                                            color: getAmountColor(account.balance),
                                        }}
                                    >
                                        {formatCurrency(account.balance, group.currency_identifier)}
                                    </Typography>
                                </Typography>
                            ))}
                        </Alert>
                    )}
                    <BalanceBarGraph group={group} />
                    {isGroupWritable && (
                        <>
                            <Divider sx={{ mt: 2 }} />
                            <Box sx={{ display: "flex", justifyContent: "center" }}>
                                <Button component={RouterLink} to={`/groups/${group.id}/settlement-plan`}>
                                    {t("accounts.settleUp")}
                                </Button>
                            </Box>
                        </>
                    )}
                </TabPanel>
                <TabPanel value="2" sx={{ padding: { xs: 1, md: 2 } }}>
                    <Statistics group={group} />
                </TabPanel>
            </TabContext>
        </MobilePaper>
    );
};
