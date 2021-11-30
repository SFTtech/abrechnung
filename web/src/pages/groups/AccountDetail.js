import { groupAccountByID } from "../../recoil/groups";
import { makeStyles } from "@mui/styles";
import { useHistory, useRouteMatch } from "react-router-dom";
import { useRecoilValue } from "recoil";
import { Grid, List, ListItem, Paper, Typography } from "@mui/material";
import { CartesianGrid, LineChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { accountBalanceHistory, accountTransactions } from "../../recoil/transactions";
import { DateTime } from "luxon";
import { TransactionLogEntry } from "../../components/transactions/TransactionLogEntry";

const useStyles = makeStyles((theme) => ({
    paper: {
        padding: theme.spacing(2)
    },
    spacerTop: {
        marginTop: theme.spacing(3)
    }
}));

export default function AccountDetail({ group }) {
    const classes = useStyles();

    const history = useHistory();
    const match = useRouteMatch();
    const accountID = parseInt(match.params.id);

    const account = useRecoilValue(groupAccountByID({ groupID: group.id, accountID: accountID }));
    const transactions = useRecoilValue(accountTransactions({groupID: group.id, accountID: accountID}));
    const balanceHistory = useRecoilValue(accountBalanceHistory({groupID: group.id, accountID: accountID}));
    // const userPermissions = useRecoilValue(currUserPermissions(group.id));

    // TODO: handle 404

    return (
        <>
            <Grid container spacing={2}>
                <Grid item xs={6}>
                    <Paper elevation={1} className={classes.paper}>
                        <Typography component="h3" variant="h5">
                            Account Detail
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={6}>
                    <Paper elevation={1} className={classes.paper}>
                        <Typography component="h3" variant="h5">
                            Balance
                        </Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart width={730} height={250} data={balanceHistory}
                                       margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                    dataKey="date"
                                    type="number"
                                    tickFormatter = {(unixTime) => DateTime.fromSeconds(unixTime).toISODate()}
                                    domain={["dataMin", "dataMax"]}
                                />
                                {/*<YAxis  type="number" unit={group.currency_symbol} domain={[dataMin => Math.min(0, dataMin), dataMax => {console.log(dataMax); return Math.max(0, dataMax)}]}/>*/}
                                <YAxis  type="number" unit={group.currency_symbol}/>
                                <Tooltip formatter={label => parseFloat(label).toFixed(2) + ` ${group.currency_symbol}`}/>
                                <Legend />
                                <Line type="stepAfter" dataKey="balance"/>
                            </LineChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>
                <Grid item xs={12}>
                    <Paper elevation={1} className={classes.paper}>
                        <Typography component="h3" variant="h5">
                            Transactions
                        </Typography>
                        <List>
                            {transactions.map(transaction => (
                                <TransactionLogEntry group={group} transaction={transaction} />
                            ))}
                        </List>
                    </Paper>
                </Grid>
            </Grid>
        </>
    );
}

