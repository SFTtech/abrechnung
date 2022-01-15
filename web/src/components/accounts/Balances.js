import {useRecoilValue} from "recoil";
import {accountsSeenByUser, personalAccountsSeenByUser} from "../../recoil/accounts";
import {accountBalances} from "../../recoil/transactions";
import {Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import {useState} from "react";
import {Alert, Box, Paper, Tab} from "@mui/material";
import {TabContext, TabList, TabPanel} from "@mui/lab";
import {useTheme} from '@mui/styles';
import {useHistory} from "react-router-dom";


export default function Balances({group}) {
    const theme = useTheme();
    const history = useHistory();

    const accounts = useRecoilValue(accountsSeenByUser(group.id));
    const personalAccounts = useRecoilValue(personalAccountsSeenByUser(group.id));
    const balances = useRecoilValue(accountBalances(group.id));

    const [selectedTab, setSelectedTab] = useState("1");

    const colorGreen = "#689f38";
    const colorRed = "#ff4242"

    const chartData = personalAccounts.map(account => {
        return {
            name: account.name,
            balance: balances[account.id],
            id: account.id
        }
    });

    const chartHeight = Math.min(600, Object.keys(balances).length * 100);

    // TODO determine the rendered width of the account names and take the maximum
    const yaxiswidth = Math.max(...accounts.map(account => account.name.length)) * 7 + 20;

    const handleBarClick= (data, event) => {
        const id = data.activePayload[0].payload.id;
        history.push(`/groups/${group.id}/accounts/${id}`);
    }

    return (
        <Paper sx={{padding: 2}}>
            <TabContext value={selectedTab}>
                <Box sx={{borderBottom: 1, borderColor: "divider"}}>
                    <TabList
                        onChange={(event, idx) => setSelectedTab(idx)}
                        centered
                    >
                        <Tab label="Chart" value="1"/>
                        <Tab label="Table" value="2"/>
                    </TabList>
                </Box>
                <TabPanel value="1">
                    {accounts.length === 0 && (
                        <Alert severity="info">No Accounts</Alert>
                    )}
                    <div
                        className="area-chart-wrapper"
                        style={{width: "100%", height: `${chartHeight}px`}}
                    >
                        <ResponsiveContainer>
                            <BarChart
                                data={chartData}
                                margin={{top: 20, right: 20, bottom: 20, left: 20}}
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
                                    formatter={label => parseFloat(label).toFixed(2) + ` ${group.currency_symbol}`}
                                    labelStyle={{color: theme.palette.text.primary}}
                                    itemStyle={{color: theme.palette.text.primary}}
                                    contentStyle={{
                                        backgroundColor: theme.palette.background.paper,
                                        borderColor: theme.palette.divider,
                                        borderRadius: theme.shape.borderRadius
                                    }}
                                />
                                <Bar dataKey="balance">
                                    {
                                        chartData.map((entry, index) => {
                                            return (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={entry["balance"] >= 0 ? colorGreen : colorRed}
                                                />
                                            )
                                        })}
                                    <LabelList
                                        dataKey={entry => `${entry["balance"].toFixed(2)}${group.currency_symbol}`}
                                        position="insideLeft"
                                        fill={theme.palette.text.primary}
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </TabPanel>
                <TabPanel value="2">

                </TabPanel>

            </TabContext>
        </Paper>
    );
}
