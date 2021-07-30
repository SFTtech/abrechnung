import {useRecoilValue} from "recoil";
import {createDebitorShare, updateDebitorShare,} from "../../recoil/transactions";
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

export default function PurchaseShares({group, transaction, wipRevision}) {
    const classes = useStyles();

    const accounts = useRecoilValue(groupAccounts(group.id));
    // TODO: sanity checking
    const creditorShares = transaction.creditor_shares;
    const creditorShare = creditorShares.length ? creditorShares[0] : null;
    const debitorShares = transaction.debitor_shares;
    const isEditing = wipRevision !== null;

    const [debitorShareValues, setDebitorShareValues] = useState({});
    const totalDebitorShares = Object.values(debitorShareValues).reduce((acc, curr) => acc + curr, 0);

    useEffect(() => {
        let shares = {};
        for (const debitorShare of debitorShares) {
            shares[debitorShare.account_id] = debitorShare.shares;
        }
        setDebitorShareValues(shares);
    }, [debitorShares])

    const onDebShareValueChange = (accountID, value) => {
        setDebitorShareValues((prevState) => {
            return {...prevState, [accountID]: parseInt(value)}
        })
    }

    const debitorShareForAccount = (accountID) => {
        return debitorShares.find(s => s.account_id === accountID);
    }

    const debitorShareValueForAccount = (accountID) => {
        return debitorShareValues.hasOwnProperty(accountID) ? debitorShareValues[accountID] : 0;
    }

    const debitorValueForAccount = (accountID) => {
        if (!debitorShareValues.hasOwnProperty(accountID) || !debitorShareForAccount(accountID)?.valid) {
            return 0.00;
        }
        return (transaction.value / totalDebitorShares * debitorShareValues[accountID]).toFixed(2);
    }

    const updateDebShare = (accountID, checked) => {
        const share = debitorShareForAccount(accountID);
        if (checked) {
            if (share) {
                updateDebitorShare({
                    debitorShareID: share.id,
                    revisionID: wipRevision.id,
                    accountID: accountID,
                    shares: debitorShareValues[accountID] || 1,
                    description: "",
                    valid: true
                })
                    .catch(err => {
                        toast.error(`Error updating debitor: ${err}!`);
                    })
            } else {
                createDebitorShare({
                    transactionID: transaction.id,
                    revisionID: wipRevision.id,
                    accountID: accountID,
                    shares: debitorShareValues[accountID] || 1,
                    description: ""
                })
                    .catch(err => {
                        toast.error(`Error creating debitor: ${err}!`);
                    })
            }
        } else {
            // TODO: delete debitor share
            if (!share) {
                // this should not happen, so do nothing
            } else {
                updateDebitorShare({
                    debitorShareID: share.id,
                    revisionID: wipRevision.id,
                    accountID: accountID,
                    shares: debitorShareValues[accountID] || 1,
                    description: "",
                    valid: false
                })
                    .catch(err => {
                        toast.error(`Error updating debitor: ${err}!`);
                    })
            }
        }
        console.log("update checked", accountID, checked)
    }

    const updateDebShareValue = (accountID, shares) => {
        console.log("update value", accountID, shares)
        // TODO: automatically disable share when shares = 0
        const share = debitorShareForAccount(accountID);
        if (share) {
            if (share.shares === parseInt(shares)) {
                return;
            }
            updateDebitorShare({
                debitorShareID: share.id,
                revisionID: wipRevision.id,
                accountID: accountID,
                shares: parseInt(shares),
                description: "",
            })
                .catch(err => {
                    toast.error(`Error updating creditor: ${err}!`);
                })
        } else {
            createDebitorShare({
                transactionID: transaction.id,
                revisionID: wipRevision.id,
                accountID: accountID,
                shares: parseInt(shares),
                description: ""
            })
                .catch(err => {
                    toast.error(`Error updating creditor: ${err}!`);
                })
        }
    }

    return (
        <div>
            <TransactionCreditorShare
                group={group}
                transaction={transaction}
                creditorShare={creditorShare}
                wipRevision={wipRevision}
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
                                    checked={debitorShareForAccount(account.id) && debitorShareForAccount(account.id).valid}
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
                    accounts.map(account => debitorShareForAccount(account.id)?.valid ? (
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
