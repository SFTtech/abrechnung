import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import React, { useState } from "react";
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
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { useTheme } from "@mui/material/styles";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import BalanceTable from "../../components/accounts/BalanceTable";
import { MobilePaper } from "../../components/style/mobile";
import ListItemLink from "../../components/style/ListItemLink";
import { useTitle } from "../../core/utils";
import { selectGroupAccountsFiltered, selectGroupById, selectAccountBalances } from "@abrechnung/redux";
import { useAppSelector, selectAccountSlice, selectGroupSlice } from "../../store";

interface Props {
    groupId: number;
}

export const Balances: React.FC<Props> = ({ groupId }) => {
    const theme: Theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
    const navigate = useNavigate();

    const group = useAppSelector((state) => selectGroupById({ state: selectGroupSlice(state), groupId }));
    const personalAccounts = useAppSelector((state) =>
        selectGroupAccountsFiltered({ state: selectAccountSlice(state), groupId, type: "personal" })
    );
    const clearingAccounts = useAppSelector((state) =>
        selectGroupAccountsFiltered({ state: selectAccountSlice(state), groupId, type: "clearing" })
    );
    const balances = useAppSelector((state) => selectAccountBalances({ state, groupId }));

    const [selectedTab, setSelectedTab] = useState("1");

    const colorGreen = theme.palette.mode === "light" ? theme.palette.success.light : theme.palette.success.dark;
    const colorRed = theme.palette.mode === "light" ? theme.palette.error.light : theme.palette.error.dark;
    const colorGreenInverted = theme.palette.mode === "dark" ? theme.palette.success.light : theme.palette.success.dark;
    const colorRedInverted = theme.palette.mode === "dark" ? theme.palette.error.light : theme.palette.error.dark;

    useTitle(`${group.name} - Balances`);

    const roundTwoDecimals = (val: number) => +val.toFixed(2);

    const chartData = personalAccounts.map((account) => {
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

    const handleBarClick = (data, event) => {
        const id = data.activePayload[0].payload.id;
        navigate(`/groups/${group.id}/accounts/${id}`);
    };

    return (
        <MobilePaper>
            <Button component={RouterLink} to={`/groups/${group.id}/settlement-plan`}>
                Settle up
            </Button>
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
                                        sx={{
                                            color: account.balance < 0 ? colorRedInverted : colorGreenInverted,
                                        }}
                                    >
                                        {account.balance.toFixed(2)} {group.currencySymbol}{" "}
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
                                            {balances[account.id]?.balance.toFixed(2)} {group.currencySymbol}
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
                                        left: 20,
                                    }}
                                    layout="vertical"
                                    onClick={handleBarClick}
                                >
                                    <XAxis
                                        stroke={theme.palette.text.primary}
                                        type="number"
                                        unit={group.currencySymbol}
                                    />
                                    <YAxis
                                        dataKey="name"
                                        stroke={theme.palette.text.primary}
                                        type="category"
                                        width={yaxiswidth}
                                    />
                                    <Tooltip
                                        formatter={(label) =>
                                            parseFloat(String(label)).toFixed(2) + ` ${group.currencySymbol}`
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
                                            dataKey={(entry) => `${entry["balance"].toFixed(2)}${group.currencySymbol}`}
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
        </MobilePaper>
    );
};

export default Balances;
