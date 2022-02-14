import { useRecoilValue } from "recoil";
import { clearingAccountsSeenByUser, personalAccountsSeenByUser } from "../../recoil/accounts";
import { accountBalances } from "../../recoil/transactions";
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import React, { useState } from "react";
import { Alert, AlertTitle, Box, Divider, List, ListItemText, Tab, Typography, useMediaQuery } from "@mui/material";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { useTheme } from "@mui/styles";
import { useHistory } from "react-router-dom";
import BalanceTable from "./BalanceTable";
import { MobilePaper } from "../style/mobile";
import ListItemLink from "../style/ListItemLink";
import { useTitle } from "../../utils";

export default function Balances({ group }) {
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
    const history = useHistory();

    const personalAccounts = useRecoilValue(personalAccountsSeenByUser(group.id));
    const clearingAccounts = useRecoilValue(clearingAccountsSeenByUser(group.id));
    const balances = useRecoilValue(accountBalances(group.id));

    const [selectedTab, setSelectedTab] = useState("1");

    const colorGreen = theme.palette.mode === "light" ? theme.palette.success.light : theme.palette.success.dark;
    const colorRed = theme.palette.mode === "light" ? theme.palette.error.light : theme.palette.error.dark;
    const colorGreenInverted = theme.palette.mode === "dark" ? theme.palette.success.light : theme.palette.success.dark;
    const colorRedInverted = theme.palette.mode === "dark" ? theme.palette.error.light : theme.palette.error.dark;

    useTitle(`${group.name} - Balances`);

    const chartData = personalAccounts.map((account) => {
        return {
            name: account.name,
            balance: balances[account.id].balance,
            totalPaid: balances[account.id].totalPaid,
            totalConsumed: balances[account.id].totalConsumed,
            id: account.id,
        };
    });

    const unbalancedClearingAccounts = clearingAccounts
        .filter((account) => balances[account.id].balance !== 0)
        .map((account) => {
            return {
                name: account.name,
                id: account.id,
                balance: balances[account.id].balance,
            };
        });

    const chartHeight = Object.keys(balances).length * 30 + 100;

    // TODO determine the rendered width of the account names and take the maximum
    const yaxiswidth = isSmallScreen
        ? Math.max(Math.max(...personalAccounts.map((account) => account.name.length)), 20)
        : Math.max(...personalAccounts.map((account) => account.name.length)) * 7 + 5;

    const handleBarClick = (data, event) => {
        const id = data.activePayload[0].payload.id;
        history.push(`/groups/${group.id}/accounts/${id}`);
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
                    {personalAccounts.length === 0 && <Alert severity="info">No Accounts</Alert>}
                    {unbalancedClearingAccounts.length !== 0 && (
                        <Alert severity="info">
                            <AlertTitle>Some Clearing Accounts have remaining balances.</AlertTitle>
                            {unbalancedClearingAccounts.map((account) => (
                                <Typography variant="body2" key={account.id} component="span">
                                    <>{account.name}:</>
                                    <Typography
                                        variant="body2"
                                        component="span"
                                        sx={{ color: account.balance < 0 ? colorRedInverted : colorGreenInverted }}
                                    >
                                        {account.balance.toFixed(2)} {group.currency_symbol}{" "}
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
                                                    balances[account.id].balance < 0
                                                        ? colorRedInverted
                                                        : colorGreenInverted,
                                            }}
                                        >
                                            {balances[account.id].balance.toFixed(2)} {group.currency_symbol}
                                        </Typography>
                                    </ListItemLink>
                                    <Divider key={parseInt(account.id) * 2} component="li" />
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
                                        left: 20,
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
                                            parseFloat(label).toFixed(2) + ` ${group.currency_symbol}`
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
                                                `${entry["balance"].toFixed(2)}${group.currency_symbol}`
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
                    <BalanceTable group={group} />
                </TabPanel>
            </TabContext>
        </MobilePaper>
    );
}
