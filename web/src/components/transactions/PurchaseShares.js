import {useRecoilValue} from "recoil";
import TransactionCreditorShare from "./TransactionCreditorShare";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import {groupAccounts} from "../../recoil/groups";
import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";
import {Checkbox, FormControlLabel, makeStyles, TextField} from "@material-ui/core";
import Divider from "@material-ui/core/Divider";
import {toast} from "react-toastify";
import {useEffect, useState} from "react";
import {createOrUpdateDebitorShare, deleteDebitorShare} from "../../api";
import {isNaN} from "formik";

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
    }
}));

function ShareInput({value, onChange}) {
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
        setError(!validate(value))
    };

    const validate = (value) => {
        return !(value === null || value === undefined || value === "" || isNaN(parseFloat(value)) || parseFloat(value) < 0);
    }

    const onKeyUp = (key) => {
        if (key.keyCode === 13) {
            onSave();
        }
    };

    return (
        <TextField
            error={error}
            margin="dense"
            style={{width: 40, marginRight: 14}}
            onBlur={onSave}
            value={currValue}
            onChange={onValueChange}
            helperText={error ? "float > 0 required" : null}
            onKeyUp={onKeyUp}
        />
    );
}

export default function PurchaseShares({group, transaction, isEditing}) {
    const classes = useStyles();

    const accounts = useRecoilValue(groupAccounts(group.id));

    const [debitorShareValues, setDebitorShareValues] = useState({});
    const totalDebitorShares = Object.values(debitorShareValues).reduce((acc, curr) => acc + curr, 0);

    const [showAdvanced, setShowAdvanced] = useState(false);

    useEffect(() => {
        setDebitorShareValues(transaction.debitor_shares);
    }, [transaction]);

    const debitorShareValueForAccount = (accountID) => {
        return debitorShareValues.hasOwnProperty(accountID) ? debitorShareValues[accountID] : 0;
    };

    const debitorValueForAccount = (accountID) => {
        if (!debitorShareValues.hasOwnProperty(accountID)) {
            return 0.00;
        }
        return (transaction.value / totalDebitorShares * debitorShareValues[accountID]);
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
        console.log("update checked", accountID, checked);
    };

    const updateDebShareValue = (accountID, shares) => {
        console.log("update value", accountID, shares);
        if (shares === 0 && debitorShareValues.hasOwnProperty(accountID)) {
            deleteDebitorShare({
                groupID: group.id,
                transactionID: transaction.id,
                accountID: accountID,
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
            <TransactionCreditorShare
                group={group}
                transaction={transaction}
                isEditing={isEditing}
                label="Paid for by"
            />
            <List>
                <ListItem className={classes.listItem}>
                    <Grid container direction="row" justify="space-between">
                        <Typography variant="subtitle1" className={classes.checkboxLabel}>
                            For whom
                        </Typography>
                        {isEditing && (
                            <FormControlLabel
                                control={<Checkbox name={`show-advanced`}/>}
                                checked={showAdvanced}
                                onChange={event => setShowAdvanced(event.target.checked)}
                                label="Advanced"/>
                        )}
                    </Grid>
                </ListItem>
                <Divider variant="middle" className={classes.divider}/>
                {isEditing ?
                    accounts.map(account => (
                        <ListItem key={account.id} className={classes.listItem}>
                            <Grid container direction="row" justify="space-between">
                                <FormControlLabel
                                    control={<Checkbox name={`${account.name}-checked`}/>}
                                    checked={transaction.debitor_shares.hasOwnProperty(account.id)}
                                    onChange={event => updateDebShare(account.id, event.target.checked)}
                                    label={account.name}/>
                                <div style={{display: "flex", flexDirection: "row", alignItems: "center"}}>
                                    {showAdvanced && (
                                        <ShareInput
                                            onChange={(value) => updateDebShareValue(account.id, value)}
                                            value={debitorShareValueForAccount(account.id)}
                                        />
                                    )}
                                    <Typography
                                        variant="body1"
                                        style={{width: 100}}
                                        align="right"
                                        className={classes.shareValue}
                                    >
                                        {debitorValueForAccount(account.id).toFixed(2)} {transaction.currency_symbol}
                                    </Typography>
                                </div>
                            </Grid>
                        </ListItem>
                    ))
                    :
                    accounts.map(account => transaction.debitor_shares.hasOwnProperty(account.id) ? (
                        <ListItem key={account.id} className={classes.listItem}>
                            <Grid container direction="row" justify="space-between">
                                <Typography variant="subtitle1">
                                    {account.name}
                                </Typography>
                                <div style={{display: "flex", flexDirection: "row", alignItems: "center"}}>
                                    <Typography
                                        variant="body1"
                                        style={{width: 100}}
                                        align="right"
                                        className={classes.shareValue}
                                    >
                                        {debitorValueForAccount(account.id).toFixed(2)} {transaction.currency_symbol}
                                    </Typography>
                                </div>
                            </Grid>
                        </ListItem>
                    ) : null)
                }
            </List>
        </div>
    );
}
