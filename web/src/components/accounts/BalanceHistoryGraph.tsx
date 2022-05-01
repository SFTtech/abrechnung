import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DateTime } from "luxon";
import { useRecoilValue } from "recoil";
import { accountBalanceHistory } from "../../state/transactions";
import { Theme, useTheme } from "@mui/material";

export default function BalanceHistoryGraph({ group, accountID }) {
    const theme: Theme = useTheme();
    const balanceHistory = useRecoilValue(accountBalanceHistory({ groupID: group.id, accountID: accountID }));

    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart
                width={730}
                height={250}
                data={balanceHistory}
                margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                }}
            >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                    dataKey="date"
                    stroke={theme.palette.text.primary}
                    type="number"
                    tickFormatter={(unixTime) => DateTime.fromSeconds(unixTime).toLocaleString()}
                    domain={["dataMin", "dataMax"]}
                />
                {/*<YAxis  type="number" unit={group.currency_symbol} domain={[dataMin => Math.min(0, dataMin), dataMax => {console.log(dataMax); return Math.max(0, dataMax)}]}/>*/}
                <YAxis
                    tickFormatter={(value) => value.toFixed(2)}
                    type="number"
                    unit={group.currency_symbol}
                    stroke={theme.palette.text.primary}
                />
                <Tooltip
                    formatter={(value) => parseFloat(value).toFixed(2) + ` ${group.currency_symbol}`}
                    labelFormatter={(unixTime) => DateTime.fromSeconds(unixTime).toLocaleString()}
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
                <Legend />
                <Line type="stepAfter" dataKey="balance" />
            </LineChart>
        </ResponsiveContainer>
    );
}
