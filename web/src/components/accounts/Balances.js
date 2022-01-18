import { useRecoilValue } from "recoil";
import { clearingAccountsSeenByUser, personalAccountsSeenByUser } from "../../recoil/accounts";
import { accountBalances } from "../../recoil/transactions";
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useState } from "react";
import { Alert, AlertTitle, Box, Paper, Tab, Typography } from "@mui/material";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { useTheme } from "@mui/styles";
import { useHistory } from "react-router-dom";
import BalanceTable from "./BalanceTable";

export default function Balances({ group }) {
    const theme = useTheme();
    const history = useHistory();

    const personalAccounts = useRecoilValue(personalAccountsSeenByUser(group.id));
    const clearingAccounts = useRecoilValue(clearingAccountsSeenByUser(group.id));
    const balances = useRecoilValue(accountBalances(group.id));

    const [selectedTab, setSelectedTab] = useState("1");

    const colorGreen = theme.palette.mode === "light" ? theme.palette.success.light : theme.palette.success.dark;
    const colorRed = theme.palette.mode === "light" ? theme.palette.error.light : theme.palette.error.dark;

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
    const yaxiswidth = Math.max(...personalAccounts.map((account) => account.name.length)) * 7;

    const handleBarClick = (data, event) => {
        const id = data.activePayload[0].payload.id;
        history.push(`/groups/${group.id}/accounts/${id}`);
    };

    return (
        <Paper sx={{ padding: 2 }}>
            <TabContext value={selectedTab}>
                <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                    <TabList onChange={(event, idx) => setSelectedTab(idx)} centered>
                        <Tab label="Chart" value="1" />
                        <Tab label="Table" value="2" />
                    </TabList>
                </Box>
                <TabPanel value="1">
                    {personalAccounts.length === 0 && <Alert severity="info">No Accounts</Alert>}
                    {unbalancedClearingAccounts.length !== 0 && (
                        <Alert severity="info">
                            <AlertTitle>Some Clearing Accounts have remaining balances.</AlertTitle>
                            <p>
                                {unbalancedClearingAccounts.map((account) => (
                                    <Typography variant="body2" key={account.id} component="span">
                                        <>{account.name}: </>
                                        <Typography
                                            variant="body2"
                                            component="span"
                                            color={account.balance < 0 ? "error" : "success"}
                                        >
                                            {account.balance.toFixed(2)} {group.currency_symbol}{" "}
                                        </Typography>
                                    </Typography>
                                ))}
                            </p>
                        </Alert>
                    )}
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
                                <XAxis stroke={theme.palette.text.primary} type="number" unit={group.currency_symbol} />
                                <YAxis
                                    dataKey="name"
                                    stroke={theme.palette.text.primary}
                                    type="category"
                                    width={yaxiswidth}
                                />
                                <Tooltip
                                    formatter={(label) => parseFloat(label).toFixed(2) + ` ${group.currency_symbol}`}
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
                                        dataKey={(entry) => `${entry["balance"].toFixed(2)}${group.currency_symbol}`}
                                        position="insideLeft"
                                        fill={theme.palette.text.primary}
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </TabPanel>
                <TabPanel value="2">
                    <BalanceTable group={group} />
                </TabPanel>
            </TabContext>
        </Paper>
    );
}
