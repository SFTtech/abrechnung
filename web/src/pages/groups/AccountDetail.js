import { groupAccountByID } from "../../recoil/accounts";
import { useRouteMatch } from "react-router-dom";
import { useRecoilValue } from "recoil";
import { Grid, List, Typography, useTheme } from "@mui/material";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { accountBalanceHistory, accountTransactions } from "../../recoil/transactions";
import { DateTime } from "luxon";
import { TransactionListEntry } from "../../components/transactions/TransactionListEntry";
import { MobilePaper } from "../../components/style/mobile";

export default function AccountDetail({ group }) {
    const match = useRouteMatch();
    const theme = useTheme();
    const accountID = parseInt(match.params.id);

    const account = useRecoilValue(groupAccountByID({ groupID: group.id, accountID: accountID }));
    const transactions = useRecoilValue(accountTransactions({ groupID: group.id, accountID: accountID }));
    const balanceHistory = useRecoilValue(accountBalanceHistory({ groupID: group.id, accountID: accountID }));
    // const userPermissions = useRecoilValue(currUserPermissions(group.id));

    // TODO: handle 404

    return (
        <Grid container spacing={2}>
            <Grid item xs={12}>
                <MobilePaper>
                    <Typography component="h3" variant="h5">
                        Balance of {account.name}
                    </Typography>
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
                </MobilePaper>
            </Grid>
            <Grid item xs={12}>
                <MobilePaper>
                    <Typography component="h3" variant="h5">
                        Transactions involving {account.name}
                    </Typography>
                    <List>
                        {transactions.map((transaction) => (
                            <TransactionListEntry group={group} transaction={transaction} />
                        ))}
                    </List>
                </MobilePaper>
            </Grid>
        </Grid>
    );
}
