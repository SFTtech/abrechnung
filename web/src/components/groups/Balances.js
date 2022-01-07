import {useRecoilValue} from "recoil";
import {groupAccounts} from "../../recoil/groups";
import {accountBalances} from "../../recoil/transactions";
import {Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import React from "react";
import {Paper} from "@mui/material";
import {useTheme} from '@mui/styles';


export default function Balances({group}) {
    const theme = useTheme();

    const accounts = useRecoilValue(groupAccounts(group.id));
    const balances = useRecoilValue(accountBalances(group.id));

    const colorGreen = "#689f38";
    const colorRed = "#ff4242"

    const chartData = Object.entries(balances).map(([accountID, balance]) => {
        return {
            name: accounts.find(acc => acc.id === parseInt(accountID)).name,
            balance: balance
        }
    });

    const chartHeight = Math.min(600, Object.keys(balances).length * 100);

    // TODO determine the rendered width of the account names and take the maximum
    const yaxiswidth = Math.max(...accounts.map(account => account.name.length)) * 7 + 20;

    return (
        <Paper sx={{padding: 2}}>
            <div className="area-chart-wrapper"
                 style={{width: "100%", height: `${chartHeight}px`}}>
                <ResponsiveContainer>
                    <BarChart
                        data={chartData}
                        margin={{top: 20, right: 20, bottom: 20, left: 20}}
                        layout="vertical"
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
                            <>
                                {
                                    chartData.map((entry, index) => {
                                        return (
                                            <Cell key={`cell-${index}`}
                                                  fill={entry["balance"] >= 0 ? colorGreen : colorRed}/>
                                        )
                                    })}
                                <LabelList
                                    dataKey={entry => `${entry["balance"].toFixed(2)} ${group.currency_symbol}`}
                                    position="insideLeft"
                                    fill={theme.palette.text.primary}
                                />
                            </>
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Paper>
    );
}
