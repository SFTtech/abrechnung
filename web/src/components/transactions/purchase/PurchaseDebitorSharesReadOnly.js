import { useRecoilValue } from "recoil";
import {
    Box,
    Checkbox,
    Divider,
    FormControlLabel,
    Grid,
    List,
    ListItem,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { makeStyles } from "@mui/styles";
import { Link } from "react-router-dom";
import { accountsSeenByUser } from "../../../recoil/accounts";
import { CompareArrows, Person } from "@mui/icons-material";

const useStyles = makeStyles((theme) => ({
    shareValue: {
        marginTop: 8,
        marginBottom: 9,
    },
    checkboxLabel: {
        marginTop: 7,
        marginBottom: 7,
    },
    listItem: {
        paddingLeft: 0,
    },
    divider: {
        marginLeft: 0,
    },
    tableLink: {
        color: theme.palette.text.primary,
        textDecoration: "none",
        display: "block",
        height: "100%",
        width: "100%",
        padding: "16px 0",
    },
    tableLinkCell: {
        padding: "0 16px",
    },
}));

export default function PurchaseDebitorSharesReadOnly({ group, transaction }) {
    const classes = useStyles();

    const accounts = useRecoilValue(accountsSeenByUser(group.id));

    const [debitorShareValues, setDebitorShareValues] = useState({});
    const [showAdvanced, setShowAdvanced] = useState(false);

    const transactionHasPositions =
        transaction.purchase_items != null && transaction.purchase_items.find((item) => !item.deleted) !== undefined;

    useEffect(() => {
        setDebitorShareValues(transaction.debitor_shares);
        for (const share of Object.values(transaction.debitor_shares)) {
            if (share !== 1) {
                setShowAdvanced(true);
                break;
            }
        }
    }, [transaction]);

    const debitorShareValueForAccount = (accountID) => {
        return debitorShareValues.hasOwnProperty(accountID) ? debitorShareValues[accountID] : 0;
    };

    const debitorValueForAccount = (accountID) => {
        if (!transaction.account_balances.hasOwnProperty(accountID)) {
            return 0.0;
        }
        return transaction.account_balances[accountID].common_debitors;
    };

    const positionValueForAccount = (accountID) => {
        if (!transaction.account_balances.hasOwnProperty(accountID)) {
            return 0.0;
        }
        return transaction.account_balances[accountID].positions;
    };
    return (
        <div>
            <List>
                <ListItem className={classes.listItem}>
                    <Grid container direction="row" justifyContent="space-between">
                        <Typography variant="subtitle1" className={classes.checkboxLabel}>
                            <Box sx={{ display: "flex", alignItems: "flex-end" }}>For whom</Box>
                        </Typography>
                        {transaction.is_wip && (
                            <FormControlLabel
                                control={<Checkbox name={`show-advanced`} />}
                                checked={showAdvanced}
                                onChange={(event) => setShowAdvanced(event.target.checked)}
                                label="Advanced"
                            />
                        )}
                    </Grid>
                </ListItem>
                <Divider variant="middle" className={classes.divider} />

                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Account</TableCell>
                                {showAdvanced && <TableCell>Shares</TableCell>}
                                {transactionHasPositions ? (
                                    <>
                                        <TableCell width="100px" align="right">
                                            Positions
                                        </TableCell>
                                        <TableCell width="3px" align="center">
                                            +
                                        </TableCell>
                                        <TableCell width="100px" align="right">
                                            Shared Rest
                                        </TableCell>
                                        <TableCell width="3px" align="center">
                                            =
                                        </TableCell>
                                        <TableCell width="100px" align="right">
                                            Total
                                        </TableCell>
                                    </>
                                ) : (
                                    <TableCell width="100px" align="right">
                                        Shared
                                    </TableCell>
                                )}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {accounts
                                .filter((account) => transaction.account_balances.hasOwnProperty(account.id))
                                .map((account) => (
                                    <TableRow hover key={account.id}>
                                        <TableCell className={classes.tableLinkCell}>
                                            {/*TODO: proper link*/}
                                            <Link
                                                className={classes.tableLink}
                                                to={`/groups/${group.id}/accounts/${account.id}`}
                                            >
                                                <Grid container direction="row" alignItems="center">
                                                    <Grid item>
                                                        {account.type === "personal" ? <Person /> : <CompareArrows />}
                                                    </Grid>
                                                    <Grid item sx={{ ml: 1 }}>
                                                        <Typography variant="body2" component="span">
                                                            {account.name}
                                                        </Typography>
                                                    </Grid>
                                                </Grid>
                                            </Link>
                                        </TableCell>
                                        {showAdvanced && (
                                            <TableCell width="50px">
                                                {debitorShareValueForAccount(account.id)}
                                            </TableCell>
                                        )}
                                        {transactionHasPositions ? (
                                            <>
                                                <TableCell align="right">
                                                    {positionValueForAccount(account.id).toFixed(2)}{" "}
                                                    {transaction.currency_symbol}
                                                </TableCell>
                                                <TableCell></TableCell>
                                                <TableCell align="right">
                                                    {debitorValueForAccount(account.id).toFixed(2)}{" "}
                                                    {transaction.currency_symbol}
                                                </TableCell>
                                                <TableCell></TableCell>
                                                <TableCell width="100px" align="right">
                                                    {(
                                                        debitorValueForAccount(account.id) +
                                                        positionValueForAccount(account.id)
                                                    ).toFixed(2)}{" "}
                                                    {transaction.currency_symbol}
                                                </TableCell>
                                            </>
                                        ) : (
                                            <TableCell width="100px" align="right">
                                                {debitorValueForAccount(account.id).toFixed(2)}{" "}
                                                {transaction.currency_symbol}
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </List>
        </div>
    );
}
