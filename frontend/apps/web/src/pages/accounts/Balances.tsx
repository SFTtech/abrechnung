import { BalanceTable } from "@/components/accounts/BalanceTable";
import { ListItemLink } from "@/components/style/ListItemLink";
import { MobilePaper } from "@/components/style/mobile";
import { useTitle } from "@/core/utils";
import { useFormatCurrency } from "@/hooks";
import { selectAccountSlice, selectGroupSlice, useAppSelector } from "@/store";
import {
    selectAccountBalances,
    selectClearingAccounts,
    selectGroupById,
    selectSortedAccounts,
} from "@abrechnung/redux";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import {
    Alert,
    AlertTitle,
    Box,
    Button,
    Divider,
    List,
    ListItemText,
    Tab,
    Theme,
    Typography,
    useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, Link as RouterLink, useNavigate } from "react-router-dom";
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CategoricalChartFunc } from "recharts/types/chart/generateCategoricalChart";

interface Props {
    groupId: number;
}

type Data = {
    name: string;
    id: number;
    balance: number;
    totalPaid: number;
    totalConsumed: number;
};

export const Balances: React.FC<Props> = ({ groupId }) => {
    const { t } = useTranslation();
    const formatCurrency = useFormatCurrency();
    const theme: Theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
    const navigate = useNavigate();

    const group = useAppSelector((state) => selectGroupById({ state: selectGroupSlice(state), groupId }));
    const personalAccounts = useAppSelector((state) =>
        selectSortedAccounts({ state: selectAccountSlice(state), groupId, sortMode: "name", type: "personal" })
    );
    const clearingAccounts = useAppSelector((state) =>
        selectClearingAccounts({ state: selectAccountSlice(state), groupId })
    );
    const balances = useAppSelector((state) => selectAccountBalances({ state, groupId }));

    const [selectedTab, setSelectedTab] = useState("1");

    const colorGreen = theme.palette.mode === "light" ? theme.palette.success.light : theme.palette.success.dark;
    const colorRed = theme.palette.mode === "light" ? theme.palette.error.light : theme.palette.error.dark;
    const colorGreenInverted = theme.palette.mode === "dark" ? theme.palette.success.light : theme.palette.success.dark;
    const colorRedInverted = theme.palette.mode === "dark" ? theme.palette.error.light : theme.palette.error.dark;

    useTitle(t("accounts.balances.tabTitle", "", { groupName: group?.name }));

    if (!group) {
        return <Navigate to="/404" />;
    }

    const roundTwoDecimals = (val: number) => +val.toFixed(2);

    const chartData: Data[] = personalAccounts.map((account) => {
        const balance = balances[account.id];
        return {
            name: account.name,
            balance: roundTwoDecimals(balance?.balance ?? 0),
            totalPaid: roundTwoDecimals(balance?.totalPaid ?? 0),
            totalConsumed: roundTwoDecimals(balance?.totalConsumed ?? 0),
            id: account.id,
        };
    });

    const unbalancedClearingAccounts = clearingAccounts
        .filter((account) => balances[account.id]?.balance !== 0)
        .map((account) => {
            return {
                name: account.name,
                id: account.id,
                balance: balances[account.id]?.balance ?? 0,
            };
        });

    const chartHeight = Object.keys(balances).length * 30 + 100;

    // TODO determine the rendered width of the account names and take the maximum
    const yaxiswidth = isSmallScreen
        ? Math.max(Math.max(...personalAccounts.map((account) => account.name.length)), 20)
        : Math.max(...personalAccounts.map((account) => account.name.length)) * 7 + 5;

    const handleBarClick: CategoricalChartFunc = (data) => {
        const id = data.activePayload?.[0].payload.id;
        navigate(`/groups/${group.id}/accounts/${id}`);
    };

    return (
        <MobilePaper>
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
                                <>
                                    <ListItemLink key={account.id} to={`/groups/${group.id}/accounts/${account.id}`}>
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
                                    <Divider key={account.id * 2} component="li" />
                                </>
                            ))}
                        </List>
                    ) : (
                        <div className="area-chart-wrapper" style={{ width: "100%", height: `${chartHeight}px` }}>
                            <ResponsiveContainer>
                                <BarChart
                                    data={chartData}
                                    margin={{
                                        top: 20,
                                        right: 20,
                                        bottom: 20,
                                        left: 30,
                                    }}
                                    layout="vertical"
                                    onClick={handleBarClick}
                                >
                                    <XAxis
                                        stroke={theme.palette.text.primary}
                                        type="number"
                                        unit={group.currency_symbol}
                                    />
                                    <YAxis
                                        dataKey="name"
                                        stroke={theme.palette.text.primary}
                                        type="category"
                                        width={yaxiswidth}
                                    />
                                    <Tooltip
                                        formatter={(label) =>
                                            formatCurrency(parseFloat(String(label)), group.currency_symbol)
                                        }
                                        labelStyle={{
                                            color: theme.palette.text.primary,
                                        }}
                                        itemStyle={{
                                            color: theme.palette.text.primary,
                                        }}
                                        contentStyle={{
                                            backgroundColor: theme.palette.background.paper,
                                            borderColor: theme.palette.divider,
                                            borderRadius: theme.shape.borderRadius,
                                        }}
                                    />
                                    <Bar dataKey="balance">
                                        {chartData.map((entry, index) => {
                                            return (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={entry["balance"] >= 0 ? colorGreen : colorRed}
                                                />
                                            );
                                        })}
                                        <LabelList
                                            dataKey={(entry) =>
                                                formatCurrency((entry as Data).balance, group.currency_symbol)
                                            }
                                            position="insideLeft"
                                            fill={theme.palette.text.primary}
                                        />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </TabPanel>
                <TabPanel value="2" sx={{ padding: { xs: 1, md: 2 } }}>
                    <BalanceTable groupId={groupId} />
                </TabPanel>
            </TabContext>
            <Divider />
            <Box sx={{ display: "flex", justifyContent: "center" }}>
                <Button component={RouterLink} to={`/groups/${group.id}/settlement-plan`}>
                    {t("accounts.settleUp")}
                </Button>
            </Box>
        </MobilePaper>
    );
};
