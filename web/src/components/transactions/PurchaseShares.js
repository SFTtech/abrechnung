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

const useStyles = makeStyles((theme) => ({
    shareValue: {
        marginTop: 8,
        marginBottom: 9,
    },
    checkboxLabel: {
        marginTop: 7,
        marginBottom: 7,
    }
}));

export default function PurchaseShares({group, transaction, isEditing}) {
    const classes = useStyles();

    const accounts = useRecoilValue(groupAccounts(group.id));

    const [debitorShareValues, setDebitorShareValues] = useState({});
    const totalDebitorShares = Object.values(debitorShareValues).reduce((acc, curr) => acc + curr, 0);

    useEffect(() => {
        setDebitorShareValues(transaction.debitor_shares);
    }, [transaction])

    const onDebShareValueChange = (accountID, value) => {
        setDebitorShareValues((prevState) => {
            return {...prevState, [accountID]: parseInt(value)}
        })
    }

    const debitorShareValueForAccount = (accountID) => {
        return debitorShareValues.hasOwnProperty(accountID) ? debitorShareValues[accountID] : 0;
    }

    const debitorValueForAccount = (accountID) => {
        if (!debitorShareValues.hasOwnProperty(accountID)) {
            return 0.00;
        }
        return (transaction.value / totalDebitorShares * debitorShareValues[accountID]).toFixed(2);
    }

    const updateDebShare = (accountID, checked) => {
        if (checked) {
            createOrUpdateDebitorShare({
                groupID: group.id,
                transactionID: transaction.id,
                accountID: accountID,
                value: debitorShareValues[accountID] || 1,
            })
                .catch(err => {
                    toast.error(`Error updating debitor: ${err}!`);
                })
        } else {
            // TODO: delete debitor share
            deleteDebitorShare({
                groupID: group.id,
                transactionID: transaction.id,
                accountID: accountID,
            })
                .catch(err => {
                    toast.error(`Error updating debitor: ${err}!`);
                })
        }
        console.log("update checked", accountID, checked)
    }

    const updateDebShareValue = (accountID, shares) => {
        console.log("update value", accountID, shares)
        // TODO: automatically disable share when shares = 0
        createOrUpdateDebitorShare({
            groupID: group.id,
            transactionID: transaction.id,
            accountID: accountID,
            value: parseInt(shares),
        })
            .catch(err => {
                toast.error(`Error updating creditor: ${err}!`);
            })
    }

    return (
        <div>
            <TransactionCreditorShare
                group={group}
                transaction={transaction}
                isEditing={isEditing}
                label="Paid for by"
            />
            <List>
                <ListItem>
                    <Grid container direction="row" justify="space-between">
                        {isEditing ? (
                            <FormControlLabel
                                control={<Checkbox color="default" name={`check-all`}/>}
                                label="For whom"/>
                        ) : (
                            <Typography variant="subtitle1" className={classes.checkboxLabel}>
                                For whom
                            </Typography>
                        )}
                    </Grid>
                </ListItem>
                <Divider variant="middle"/>
                {isEditing ?
                    accounts.map(account => (
                        <ListItem key={account.id}>
                            <Grid container direction="row" justify="space-between">
                                <FormControlLabel
                                    control={<Checkbox name={`${account.name}-checked`}/>}
                                    checked={transaction.debitor_shares.hasOwnProperty(account.id)}
                                    onChange={event => updateDebShare(account.id, event.target.checked)}
                                    label={account.name}/>
                                <div style={{display: "flex", flexDirection: "row", alignItems: "center"}}>
                                    <TextField
                                        margin="dense"
                                        style={{width: 40, marginRight: 14}}
                                        onBlur={(event) => updateDebShareValue(account.id, event.target.value)}
                                        value={debitorShareValueForAccount(account.id)}
                                        onChange={event => onDebShareValueChange(account.id, event.target.value)}
                                    />
                                    <Typography variant="body1" style={{width: 60}} className={classes.shareValue}>
                                        {debitorValueForAccount(account.id)} {transaction.currency_symbol}
                                    </Typography>
                                </div>
                            </Grid>
                        </ListItem>
                    ))
                    :
                    accounts.map(account => transaction.debitor_shares.hasOwnProperty(account.id) ? (
                        <ListItem key={account.id}>
                            <Grid container direction="row" justify="space-between">
                                <Typography variant="subtitle1">
                                    {account.name}
                                </Typography>
                                <div style={{display: "flex", flexDirection: "row", alignItems: "center"}}>
                                    <Typography variant="body1" style={{width: 60}} className={classes.shareValue}>
                                        {debitorValueForAccount(account.id)} {transaction.currency_symbol}
                                    </Typography>
                                </div>
                            </Grid>
                        </ListItem>
                    ) : null)
                }
            </List>
        </div>
    )
}
