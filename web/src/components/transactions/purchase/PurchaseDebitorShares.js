import {useRecoilValue, useSetRecoilState} from "recoil";
import {
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
    TextField,
    Typography
} from "@mui/material";
import {toast} from "react-toastify";
import {useEffect, useState} from "react";
import {createOrUpdateDebitorShare, deleteDebitorShare} from "../../../api";
import {makeStyles} from "@mui/styles";
import {Link} from "react-router-dom";
import {groupTransactions, updateTransaction} from "../../../recoil/transactions";
import {accountsSeenByUser} from "../../../recoil/accounts";
import {ShareInput} from "../../ShareInput";

const useStyles = makeStyles((theme) => ({
    shareValue: {
        marginTop: 8,
        marginBottom: 9
    },
    checkboxLabel: {
        marginTop: 7,
        marginBottom: 7
    },
    listItem: {
        paddingLeft: 0
    },
    divider: {
        marginLeft: 0
    },
    tableLink: {
        color: theme.palette.text.primary,
        textDecoration: "none",
        display: "block",
        height: "100%",
        width: "100%",
        padding: "16px 0"
    },
    tableLinkCell: {
        padding: "0 16px"
    }
}));

export default function PurchaseDebitorShares({group, transaction, showPositions = false}) {
    const classes = useStyles();

    const accounts = useRecoilValue(accountsSeenByUser(group.id));
    const setTransactions = useSetRecoilState(groupTransactions(transaction.group_id));

    const [debitorShareValues, setDebitorShareValues] = useState({});
    const [showAdvanced, setShowAdvanced] = useState(false);

    const transactionHasPositions =
        transaction.purchase_items != null
        && transaction.purchase_items.find(item => !item.deleted) !== undefined;

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
            return 0.00;
        }
        return transaction.account_balances[accountID].common_debitors;
    };

    const positionValueForAccount = (accountID) => {
        if (!transaction.account_balances.hasOwnProperty(accountID)) {
            return 0.00;
        }
        return transaction.account_balances[accountID].positions;
    };

    const updateDebShare = (accountID, checked) => {
        if (checked) {
            createOrUpdateDebitorShare({
                groupID: group.id,
                transactionID: transaction.id,
                accountID: accountID,
                value: debitorShareValues[accountID] || 1
            })
                .then(t => {
                    updateTransaction(t, setTransactions);
                })
                .catch(err => {
                    toast.error(err);
                });
        } else {
            // TODO: delete debitor share
            deleteDebitorShare({
                groupID: group.id,
                transactionID: transaction.id,
                accountID: accountID
            })
                .then(t => {
                    updateTransaction(t, setTransactions);
                })
                .catch(err => {
                    toast.error(err);
                });
        }
    };

    const updateDebShareValue = (accountID, shares) => {
        if (shares === 0 && debitorShareValues.hasOwnProperty(accountID)) {
            deleteDebitorShare({
                groupID: group.id,
                transactionID: transaction.id,
                accountID: accountID
            })
                .then(t => {
                    updateTransaction(t, setTransactions);
                })
                .catch(err => {
                    toast.error(err);
                });
        } else if (shares > 0) {
            createOrUpdateDebitorShare({
                groupID: group.id,
                transactionID: transaction.id,
                accountID: accountID,
                value: shares
            })
                .then(t => {
                    updateTransaction(t, setTransactions);
                })
                .catch(err => {
                    toast.error(err);
                });
        }
    };

    return (
        <div>
            <List>
                <ListItem className={classes.listItem}>
                    <Grid container direction="row" justifyContent="space-between">
                        <Typography variant="subtitle1" className={classes.checkboxLabel}>
                            For whom
                        </Typography>
                        {transaction.is_wip && (
                            <FormControlLabel
                                control={<Checkbox name={`show-advanced`}/>}
                                checked={showAdvanced}
                                onChange={event => setShowAdvanced(event.target.checked)}
                                label="Advanced"/>
                        )}
                    </Grid>
                </ListItem>
                <Divider variant="middle" className={classes.divider}/>
                {transaction.is_wip ? (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Account</TableCell>
                                    <TableCell width="100px">Shares</TableCell>
                                    {showPositions || transactionHasPositions ? (
                                        <>
                                            <TableCell width="100px" align="right">Positions</TableCell>
                                            <TableCell width="3px" align="center">+</TableCell>
                                            <TableCell width="100px" align="right">Shared + Rest</TableCell>
                                            <TableCell width="3px" align="center">=</TableCell>
                                            <TableCell width="100px" align="right">Total</TableCell>
                                        </>
                                    ) : (
                                        <TableCell width="100px" align="right">Shared</TableCell>
                                    )}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {accounts.map(account => (
                                    <TableRow hover key={account.id}>
                                        <TableCell>{account.name}</TableCell>
                                        <TableCell
                                            width="100px"
                                        >
                                            {showAdvanced ? (
                                                <ShareInput
                                                    onChange={(value) => updateDebShareValue(account.id, value)}
                                                    value={debitorShareValueForAccount(account.id)}
                                                />
                                            ) : (
                                                <Checkbox
                                                    name={`${account.name}-checked`}
                                                    checked={transaction.debitor_shares.hasOwnProperty(account.id)}
                                                    onChange={event => updateDebShare(account.id, event.target.checked)}
                                                />
                                            )}
                                        </TableCell>
                                        {showPositions || transactionHasPositions ? (
                                            <>
                                                <TableCell
                                                    align="right"
                                                >
                                                    {positionValueForAccount(account.id).toFixed(2)} {transaction.currency_symbol}
                                                </TableCell>
                                                <TableCell></TableCell>
                                                <TableCell
                                                    align="right"
                                                >
                                                    {debitorValueForAccount(account.id).toFixed(2)} {transaction.currency_symbol}
                                                </TableCell>
                                                <TableCell></TableCell>
                                                <TableCell
                                                    width="100px"
                                                    align="right"
                                                >
                                                    {(debitorValueForAccount(account.id) + positionValueForAccount(account.id)).toFixed(2)} {transaction.currency_symbol}
                                                </TableCell>
                                            </>
                                        ) : (
                                            <TableCell
                                                width="100px"
                                                align="right"
                                            >
                                                {(debitorValueForAccount(account.id) + positionValueForAccount(account.id)).toFixed(2)} {transaction.currency_symbol}
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Account</TableCell>
                                    {showAdvanced && (
                                        <TableCell>Shares</TableCell>
                                    )}
                                    {transactionHasPositions ? (
                                        <>
                                            <TableCell width="100px" align="right">Positions</TableCell>
                                            <TableCell width="3px" align="center">+</TableCell>
                                            <TableCell width="100px" align="right">Shared Rest</TableCell>
                                            <TableCell width="3px" align="center">=</TableCell>
                                            <TableCell width="100px" align="right">Total</TableCell>
                                        </>
                                    ) : (
                                        <TableCell width="100px" align="right">Shared</TableCell>
                                    )}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {accounts.filter(account => transaction.debitor_shares.hasOwnProperty(account.id)).map(account => (
                                    <TableRow
                                        hover
                                        key={account.id}
                                    >
                                        <TableCell className={classes.tableLinkCell}>
                                            {/*TODO: proper link*/}
                                            <Link
                                                className={classes.tableLink}
                                                to={`/groups/${group.id}/accounts/${account.id}`}
                                            >
                                                {account.name}
                                            </Link>
                                        </TableCell>
                                        {showAdvanced && (
                                            <TableCell
                                                width="50px"
                                            >
                                                {debitorShareValueForAccount(account.id)}
                                            </TableCell>
                                        )}
                                        {transactionHasPositions ? (
                                            <>
                                                <TableCell
                                                    align="right"
                                                >
                                                    {positionValueForAccount(account.id).toFixed(2)} {transaction.currency_symbol}
                                                </TableCell>
                                                <TableCell></TableCell>
                                                <TableCell
                                                    align="right"
                                                >
                                                    {debitorValueForAccount(account.id).toFixed(2)} {transaction.currency_symbol}
                                                </TableCell>
                                                <TableCell></TableCell>
                                                <TableCell
                                                    width="100px"
                                                    align="right"
                                                >
                                                    {(debitorValueForAccount(account.id) + positionValueForAccount(account.id)).toFixed(2)} {transaction.currency_symbol}
                                                </TableCell>
                                            </>
                                        ) : (
                                            <TableCell
                                                width="100px"
                                                align="right"
                                            >
                                                {debitorValueForAccount(account.id).toFixed(2)} {transaction.currency_symbol}
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </List>
        </div>
    );
}
