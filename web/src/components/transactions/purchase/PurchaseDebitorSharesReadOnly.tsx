import { useRecoilValue } from "recoil";
import {
    Box,
    Divider,
    Grid,
    List,
    ListItem,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Theme,
    Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { makeStyles } from "@mui/styles";
import { Link } from "react-router-dom";
import { accountsSeenByUser } from "../../../state/accounts";
import { ClearingAccountIcon, PersonalAccountIcon } from "../../style/AbrechnungIcons";

const useStyles = makeStyles((theme: Theme) => ({
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
        transaction.positions != null && transaction.positions.find((item) => !item.deleted) !== undefined;

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

    return (
        <List>
            <ListItem className={classes.listItem}>
                <Grid container direction="row" justifyContent="space-between">
                    <Typography variant="subtitle1" className={classes.checkboxLabel}>
                        <Box sx={{ display: "flex", alignItems: "flex-end" }}>For whom</Box>
                    </Typography>
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
                            .filter(
                                (account) =>
                                    transaction.account_balances.hasOwnProperty(account.id) &&
                                    (transaction.account_balances[account.id].common_debitors !== 0 ||
                                        transaction.account_balances[account.id].positions)
                            )
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
                                                    {account.type === "personal" ? (
                                                        <PersonalAccountIcon />
                                                    ) : (
                                                        <ClearingAccountIcon />
                                                    )}
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
                                        <TableCell width="50px">{debitorShareValueForAccount(account.id)}</TableCell>
                                    )}
                                    {transactionHasPositions ? (
                                        <>
                                            <TableCell align="right">
                                                {transaction.account_balances[account.id].positions.toFixed(2)}{" "}
                                                {transaction.currency_symbol}
                                            </TableCell>
                                            <TableCell></TableCell>
                                            <TableCell align="right">
                                                {transaction.account_balances[account.id].common_debitors.toFixed(2)}{" "}
                                                {transaction.currency_symbol}
                                            </TableCell>
                                            <TableCell></TableCell>
                                            <TableCell width="100px" align="right">
                                                {(
                                                    transaction.account_balances[account.id].common_debitors +
                                                    transaction.account_balances[account.id].positions
                                                ).toFixed(2)}{" "}
                                                {transaction.currency_symbol}
                                            </TableCell>
                                        </>
                                    ) : (
                                        <TableCell width="100px" align="right">
                                            {transaction.account_balances[account.id].common_debitors.toFixed(2)}{" "}
                                            {transaction.currency_symbol}
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </List>
    );
}
