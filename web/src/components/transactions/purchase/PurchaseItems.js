import React, { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField } from "@mui/material";
import { useRecoilValue } from "recoil";
import { groupAccounts } from "../../../recoil/groups";
import { addOrChangePurchaseItemShare, deletePurchaseItemShare, updatePurchaseItem } from "../../../api";
import { toast } from "react-toastify";
import { makeStyles } from "@mui/styles";


const useStyles = makeStyles({
    table: {
        minWidth: 650
    }
});

function ShareInput({ value, onChange }) {
    const [currValue, setValue] = useState(0);
    const [error, setError] = useState(false);

    const validate = (value) => {
        return !(value === null || value === undefined || value === "" || isNaN(parseFloat(value)) || parseFloat(value) < 0);
    };

    useEffect(() => {
        setValue(value);
        setError(!validate(value));
    }, [value, validate]);

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

    const onKeyUp = (key) => {
        if (key.keyCode === 13) {
            onSave();
        }
    };

    return (
        <TextField
            margin="dense"
            variant="standard"
            style={{ width: 40 }}
            onBlur={onSave}
            value={currValue}
            onChange={onValueChange}
            onKeyUp={onKeyUp}
        />
    );
}

function WrappedTextField({ value, onChange, initial = null, errorMsg = null, validate = null, ...props }) {
    const [currValue, setValue] = useState(initial);
    const [error, setError] = useState(false);

    useEffect(() => {
        setValue(value);
        if (validate !== null) {
            setError(!validate(value));
        }
    }, [value]);

    const onSave = () => {
        if (!error) {
            onChange(currValue);
        }
    };

    const onValueChange = (event) => {
        const val = event.target.value;
        setValue(val);
        if (validate !== null) {
            setError(!validate(val));
        }
    };

    const onKeyUp = (key) => {
        if (key.keyCode === 13) {
            onSave();
        }
    };

    return (
        <TextField
            margin="dense"
            variant="standard"
            onBlur={onSave}
            value={currValue}
            onChange={onValueChange}
            onKeyUp={onKeyUp}
            error={error}
            helperText={error && errorMsg ? errorMsg : null}
            {...props}
        />
    );
}

export default function PurchaseItems({ group, transaction }) {
    const classes = useStyles();
    const accounts = useRecoilValue(groupAccounts(group.id));
    const transactionAccounts = Object.keys(transaction.debitor_shares).map(id => parseInt(id));
    const [wipItem, setWipItem] = useState({ name: "", price: 0, communistShares: 1 });

    const validateFloat = (value) => {
        return !(value === null || value === undefined || value === "" || isNaN(parseFloat(value)) || parseFloat(value) < 0);
    };

    const updateItem = (itemID, name, price, communistShares) => {
        if (transaction.is_wip) {
            updatePurchaseItem({
                itemID: itemID,
                price: price,
                name: name,
                communistShares: communistShares
            }).catch(err => {
                toast.error(err);
            });
        }
    };

    const updateWipItem = ({ name, price, communistShares }) => {
        setWipItem({ name: name, price: price, communistShares: communistShares });
        if (name !== "" && name != null && price > 0) {

        }
    };

    const updateItemUsage = (item, accountID, shares) => {
        if (shares === 0 && item.usages.hasOwnProperty(accountID)) {
            deletePurchaseItemShare({
                itemID: item.id,
                accountID: accountID
            })
                .catch(err => {
                    toast.error(err);
                });
        } else if (shares > 0) {
            addOrChangePurchaseItemShare({
                itemID: item.id,
                accountID: accountID,
                shareAmount: shares
            })
                .catch(err => {
                    toast.error(err);
                });
        }
    };

    return (
        <TableContainer>
            <Table className={classes.table} aria-label="purchase items">
                <TableHead>
                    <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Price</TableCell>
                        <TableCell>Communist Shares</TableCell>
                        {transactionAccounts.map(accountID => (
                            <TableCell>{accounts.find(account => account.id === accountID).name}</TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {transaction.purchase_items?.map(item =>
                        <TableRow key={item.id}>
                            <TableCell>
                                <WrappedTextField
                                    value={item.name}
                                    onChange={value => updateItem(item.id, value, item.price, item.communist_shares)}
                                    validate={value => value !== "" && value != null}
                                />
                            </TableCell>
                            <TableCell>
                                <WrappedTextField
                                    value={item.price}
                                    onChange={value => updateItem(item.id, item.name, parseFloat(value), item.communist_shares)}
                                    validate={validateFloat}
                                    errorMsg={"float > 0 required"}
                                />
                            </TableCell>
                            <TableCell>
                                <ShareInput
                                    value={item.communist_shares}
                                    onChange={value => updateItem(item.id, item.name, item.price, value)}
                                />
                            </TableCell>
                            {transactionAccounts.map(accountID => (
                                <TableCell>
                                    <ShareInput
                                        value={item.usages.hasOwnProperty(String(accountID)) ? item.usages[String(accountID)] : 0}
                                        onChange={value => updateItemUsage(item, accountID, value)}
                                    />
                                </TableCell>
                            ))}
                        </TableRow>
                    )}
                    <TableRow>
                        <TableCell>
                            <WrappedTextField
                                value={wipItem.name}
                                onChange={value => updateWipItem({ ...wipItem, name: value })}
                                validate={value => value !== "" && value != null}
                            />
                        </TableCell>
                        <TableCell>
                            <WrappedTextField
                                value={wipItem.price}
                                onChange={value => updateWipItem({ ...wipItem, price: value })}
                                validate={validateFloat}
                                errorMsg={"float > 0 required"} />
                        </TableCell>
                        <TableCell>
                            <ShareInput
                                value={wipItem.communistShares}
                                onChange={value => updateWipItem({
                                    ...wipItem,
                                    communistShares: value
                                })} />
                        </TableCell>
                        {transactionAccounts.map(accountID => (
                            <TableCell><ShareInput /></TableCell>
                        ))}
                    </TableRow>
                </TableBody>
            </Table>
        </TableContainer>
    );
}
