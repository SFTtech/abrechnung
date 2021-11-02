import React from "react";
import TransactionCreditorShare from "./TransactionCreditorShare";
import TransactionDescription from "./TransactionDescription";
import TransactionBilledAt from "./TransactionBilledAt";
import TransactionValue from "./TransactionValue";
import TransactionDebitorShare from "./TransactionDebitorShare";
import { makeStyles } from "@mui/styles";

const useStyles = makeStyles((theme) => ({
    shares: {
        marginBottom: theme.spacing(2)
    }
}));

export default function TransferDetails({ group, transaction }) {
    const classes = useStyles();

    return (
        <>
            <TransactionDescription group={group} transaction={transaction} />
            <TransactionValue group={group} transaction={transaction} />
            <TransactionBilledAt group={group} transaction={transaction} />

            <TransactionCreditorShare
                group={group}
                transaction={transaction}
                isEditing={transaction.is_wip}
                label="From"
                className={classes.shares}
            />

            <TransactionDebitorShare
                group={group}
                transaction={transaction}
                isEditing={transaction.is_wip}
                label="To"
                className={classes.shares}
            />
        </>
    );
}

