import React from "react";
import TransactionCreditorShare from "../TransactionCreditorShare";
import TransactionDescription from "../TransactionDescription";
import TransactionBilledAt from "../TransactionBilledAt";
import TransactionValue from "../TransactionValue";
import TransactionDebitorShare from "../TransactionDebitorShare";
import TransactionActions from "../TransactionActions";
import { Divider, Grid, Paper } from "@mui/material";
import FileGallery from "../FileGallery";


export default function TransferDetails({ group, transaction }) {

    return (
        <Paper elevation={1} sx={{ padding: 2 }}>
            <TransactionActions group={group} transaction={transaction} />
            <Divider sx={{ marginBottom: 1, marginTop: 1 }} />
            <Grid container>
                <Grid item xs={transaction.is_wip || transaction.files.length > 0 ? 6 : 12}>
                    <TransactionDescription group={group} transaction={transaction} />
                    <TransactionValue group={group} transaction={transaction} />
                    <TransactionBilledAt group={group} transaction={transaction} />

                    <TransactionCreditorShare
                        group={group}
                        transaction={transaction}
                        isEditing={transaction.is_wip}
                        label="From"
                    />

                    <TransactionDebitorShare
                        group={group}
                        transaction={transaction}
                        isEditing={transaction.is_wip}
                        label="To"
                    />
                </Grid>

                {(transaction.is_wip || transaction.files.length > 0) && (
                    <Grid item xs={6}>
                        <FileGallery transaction={transaction} />
                    </Grid>
                )}
            </Grid>
        </Paper>
    );
}

