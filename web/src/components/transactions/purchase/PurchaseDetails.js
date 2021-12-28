import React, { useState } from "react";
import PurchaseDebitorShares from "./PurchaseDebitorShares";
import TransactionCreditorShare from "../TransactionCreditorShare";
import TransactionDescription from "../TransactionDescription";
import TransactionBilledAt from "../TransactionBilledAt";
import TransactionValue from "../TransactionValue";
import { Button, Divider, Grid, Paper } from "@mui/material";
import FileGallery from "../FileGallery";
import TransactionActions from "../TransactionActions";
import PurchaseItems from "./PurchaseItems";
import { Add } from "@mui/icons-material";

export default function PurchaseDetails({ group, transaction }) {
    const [showPositions, setShowPositions] = useState(false);

    return (
        <>
            <Paper elevation={1} sx={{ padding: 2 }}>
                <TransactionActions group={group} transaction={transaction} />
                <Divider sx={{ marginBottom: 1, marginTop: 1 }} />
                <Grid container>
                    <Grid item xs={transaction.is_wip || transaction.files.length > 0 ? 6 : 12}>
                        <TransactionDescription group={group} transaction={transaction} />
                        <TransactionBilledAt group={group} transaction={transaction} />

                        <TransactionCreditorShare
                            group={group}
                            transaction={transaction}
                            isEditing={transaction.is_wip}
                            label="Paid for by"
                        />

                        <TransactionValue group={group} transaction={transaction} />
                    </Grid>

                    {(transaction.is_wip || transaction.files.length > 0) && (
                        <Grid item xs={6}>
                            <FileGallery transaction={transaction} />
                        </Grid>
                    )}
                    <Grid item xs={12}>
                        <PurchaseDebitorShares group={group} transaction={transaction} showPositions={showPositions} />
                    </Grid>
                </Grid>
            </Paper>

            {!showPositions && transaction.is_wip && transaction.purchase_items.find(item => !item.deleted) === undefined ? (
                <Grid container justifyContent="center" sx={{ marginTop: 2 }}>
                    <Button startIcon={<Add />} onClick={() => setShowPositions(true)}>Add Positions</Button>
                </Grid>
            ) : ((showPositions && transaction.is_wip) || transaction.purchase_items.find(item => !item.deleted) !== undefined) ? (
                <PurchaseItems group={group} transaction={transaction} />
            ) : (<></>)}
        </>
    );
}

