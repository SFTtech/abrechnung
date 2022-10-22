import React, { useState } from "react";
import PurchaseDebitorShares from "./PurchaseDebitorShares";
import TransactionCreditorShare from "../TransactionCreditorShare";
import TransactionDescription from "../TransactionDescription";
import TransactionBilledAt from "../TransactionBilledAt";
import TransactionValue from "../TransactionValue";
import { Button, Divider, Grid } from "@mui/material";
import FileGallery from "../FileGallery";
import TransactionActions from "../TransactionActions";
import TransactionPositions from "./TransactionPositions";
import { Add } from "@mui/icons-material";
import PurchaseDebitorSharesReadOnly from "./PurchaseDebitorSharesReadOnly";
import { MobilePaper } from "../../style/mobile";
import { Group, Transaction } from "@abrechnung/types";

interface Props {
    group: Group;
    transaction: Transaction;
}

export const PurchaseDetails: React.FC<Props> = ({ group, transaction }) => {
    const [showPositions, setShowPositions] = useState(false);

    return (
        <>
            <MobilePaper>
                <TransactionActions groupID={group.id} transaction={transaction} />
                <Divider sx={{ marginBottom: 1, marginTop: 1 }} />
                <Grid container>
                    <Grid item xs={12} md={transaction.isWip || transaction.attachments.length > 0 ? 6 : 12}>
                        <TransactionDescription transaction={transaction} />
                        <TransactionBilledAt transaction={transaction} />

                        <TransactionCreditorShare
                            group={group}
                            transaction={transaction}
                            isEditing={transaction.isWip}
                            label="Paid by"
                        />

                        <TransactionValue transaction={transaction} />
                    </Grid>

                    {(transaction.isWip || transaction.attachments.length > 0) && (
                        <Grid item xs={12} md={6} sx={{ marginTop: { xs: 1 } }}>
                            <FileGallery transaction={transaction} />
                        </Grid>
                    )}
                    <Grid item xs={12}>
                        {transaction.isWip ? (
                            <PurchaseDebitorShares
                                group={group}
                                transaction={transaction}
                                showPositions={showPositions}
                            />
                        ) : (
                            <PurchaseDebitorSharesReadOnly group={group} transaction={transaction} />
                        )}
                    </Grid>
                </Grid>
            </MobilePaper>

            {!showPositions &&
            transaction.isWip &&
            transaction.positions.find((item) => !item.deleted) === undefined ? (
                <Grid container justifyContent="center" sx={{ marginTop: 2 }}>
                    <Button startIcon={<Add />} onClick={() => setShowPositions(true)}>
                        Add Positions
                    </Button>
                </Grid>
            ) : (showPositions && transaction.isWip) ||
              transaction.positions.find((item) => !item.deleted) !== undefined ? (
                <TransactionPositions group={group} transaction={transaction} />
            ) : null}
        </>
    );
};

export default PurchaseDetails;
