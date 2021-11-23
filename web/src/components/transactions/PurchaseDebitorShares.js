import { useRecoilValue } from "recoil";
import { groupAccounts } from "../../recoil/groups";
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
import { toast } from "react-toastify";
import { useEffect, useState } from "react";
import { createOrUpdateDebitorShare, deleteDebitorShare } from "../../api";
import { makeStyles } from "@mui/styles";

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
    }
}));

function ShareInput({ value, onChange }) {
    const [currValue, setValue] = useState(0);
    const [error, setError] = useState(false);

    useEffect(() => {
        setValue(value);
        setError(!validate(value));
    }, [value]);

    const onSave = () => {
        if (!error) {
            onChange(parseFloat(currValue));
        }
    };

    const onValueChange = (event) => {
        const val = event.target.value;
        setValue(val);
        setError(!validate(value));
    };

    const validate = (value) => {
        return !(value === null || value === undefined || value === "" || isNaN(parseFloat(value)) || parseFloat(value) < 0);
    };

    const onKeyUp = (key) => {
        if (key.keyCode === 13) {
            onSave();
        }
    };

    return (
        <TextField
            error={error}
            margin="dense"
            variant="standard"
            style={{ width: 40, paddingTop: 1, marginRight: 2 }}
            onBlur={onSave}
            value={currValue}
            onChange={onValueChange}
            helperText={error ? "float > 0 required" : null}
            onKeyUp={onKeyUp}
        />
    );
}

export default function PurchaseDebitorShares({ group, transaction, isEditing }) {
    const classes = useStyles();

    const accounts = useRecoilValue(groupAccounts(group.id));

    const [debitorShareValues, setDebitorShareValues] = useState({});

    const [showAdvanced, setShowAdvanced] = useState(false);

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
                        {isEditing && (
                            <FormControlLabel
                                control={<Checkbox name={`show-advanced`} />}
                                checked={showAdvanced}
                                onChange={event => setShowAdvanced(event.target.checked)}
                                label="Advanced" />
                        )}
                    </Grid>
                </ListItem>
                <Divider variant="middle" className={classes.divider} />
                {isEditing ? (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Account</TableCell>
                                    <TableCell width="100px">Shares</TableCell>
                                    <TableCell width="100px" align="right">Positions</TableCell>
                                    <TableCell width="3px" align="center">+</TableCell>
                                    <TableCell width="100px" align="right">Shared + Rest</TableCell>
                                    <TableCell width="3px" align="center">=</TableCell>
                                    <TableCell width="100px" align="right">Total</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {accounts.map(account => (
                                    <TableRow key={account.id}>
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
                                    <TableCell width="100px" align="right">Positions</TableCell>
                                    <TableCell width="3px" align="center">+</TableCell>
                                    <TableCell width="100px" align="right">Shared Rest</TableCell>
                                    <TableCell width="3px" align="center">=</TableCell>
                                    <TableCell width="100px" align="right">Total</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {accounts.map(account => transaction.debitor_shares.hasOwnProperty(account.id) ? (
                                    <TableRow key={account.id}>
                                        <TableCell>{account.name}</TableCell>
                                        {showAdvanced && (
                                            <TableCell
                                                width="50px"
                                            >
                                                {debitorShareValueForAccount(account.id)}
                                            </TableCell>
                                        )}
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
                                    </TableRow>
                                ) : null)}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </List>
        </div>
    );
}
