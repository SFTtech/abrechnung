import { useFormatCurrency, useIsSmallScreen } from "@/hooks";
import { useAppSelector } from "@/store";
import { Group } from "@abrechnung/api";
import { getCurrencySymbolForIdentifier } from "@abrechnung/core";
import { selectAccountBalances, useSortedAccounts } from "@abrechnung/redux";
import { Theme } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import * as React from "react";
import { useNavigate } from "react-router";
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CategoricalChartFunc } from "recharts/types/chart/types";

export type BalanceBarGraphProps = {
    group: Group;
};

type Data = {
    name: string;
    id: number;
    balance: number;
    totalPaid: number;
    totalConsumed: number;
};

export const BalanceBarGraph: React.FC<BalanceBarGraphProps> = ({ group }) => {
    const formatCurrency = useFormatCurrency();
    const theme: Theme = useTheme();
    const isSmallScreen = useIsSmallScreen();
    const navigate = useNavigate();

    const personalAccounts = useSortedAccounts(group.id, "name", "personal");
    const balances = useAppSelector((state) => selectAccountBalances(state, group.id));

    const colorGreen = theme.palette.mode === "light" ? theme.palette.success.light : theme.palette.success.dark;
    const colorRed = theme.palette.mode === "light" ? theme.palette.error.light : theme.palette.error.dark;

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

    const chartHeight = Object.keys(balances).length * 30 + 100;

    // TODO determine the rendered width of the account names and take the maximum
    const yaxiswidth = isSmallScreen
        ? Math.max(Math.max(...personalAccounts.map((account) => account.name.length)), 20)
        : Math.max(...personalAccounts.map((account) => account.name.length)) * 7 + 5;

    const handleBarClick: CategoricalChartFunc = (data) => {
        const accountIndexInList = Number(data.activeTooltipIndex);
        const acc = personalAccounts[accountIndexInList];
        navigate(`/groups/${group.id}/accounts/${acc.id}`);
    };

    return (
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
                        unit={getCurrencySymbolForIdentifier(group.currency_identifier)}
                    />
                    <YAxis dataKey="name" stroke={theme.palette.text.primary} type="category" width={yaxiswidth} />
                    <Tooltip
                        formatter={(label) => formatCurrency(parseFloat(String(label)), group.currency_identifier)}
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
                            return <Cell key={`cell-${index}`} fill={entry["balance"] >= 0 ? colorGreen : colorRed} />;
                        })}
                        <LabelList
                            dataKey={(entry) => formatCurrency((entry as Data).balance, group.currency_identifier)}
                            position="insideLeft"
                            fill={theme.palette.text.primary}
                        />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
