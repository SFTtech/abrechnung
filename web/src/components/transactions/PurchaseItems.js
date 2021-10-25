import React, {useEffect, useState} from "react";
import {
    makeStyles,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow, TextField,
    Typography
} from "@material-ui/core";
import {useRecoilValue} from "recoil";
import {groupAccounts} from "../../recoil/groups";


const useStyles = makeStyles({
    table: {
        minWidth: 650,
    },
});

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
            margin="dense"
            style={{ width: 40 }}
            onBlur={onSave}
            value={currValue}
            onChange={onValueChange}
            onKeyUp={onKeyUp}
        />
    );
}

export default function PurchaseItems({group, transaction}) {
    const classes = useStyles();
    const accounts = useRecoilValue(groupAccounts(group.id));
    const transactionAccounts = Object.keys(transaction.debitor_shares).map(id => parseInt(id));

    return (
        <>
            <Typography variant="subtitle2">
                Purchase Items
            </Typography>
            <TableContainer>
                <Table className={classes.table} aria-label="purchase items">
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            {transactionAccounts.map(accountID => (
                                <TableCell>{accounts.find(account => account.id === accountID).name}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        <TableRow>
                            <TableCell>
                                <TextField />
                            </TableCell>
                            {transactionAccounts.map(accountID => (
                                <TableCell><ShareInput /></TableCell>
                            ))}
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
        </>
    );
}
