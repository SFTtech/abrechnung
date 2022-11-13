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
import { useAppSelector, selectTransactionSlice } from "../../../store";
import {
    selectTransactionById,
    selectTransactionHasPositions,
    selectTransactionHasAttachments,
} from "@abrechnung/redux";

interface Props {
    groupId: number;
    transactionId: number;
}

export const PurchaseDetails: React.FC<Props> = ({ groupId, transactionId }) => {
    const [showPositions, setShowPositions] = useState(false);

    const transaction = useAppSelector((state) =>
        selectTransactionById({ state: selectTransactionSlice(state), groupId, transactionId })
    );

    const hasAttachments = useAppSelector((state) =>
        selectTransactionHasAttachments({ state: selectTransactionSlice(state), groupId, transactionId })
    );
    const hasPositions = useAppSelector((state) =>
        selectTransactionHasPositions({ state: selectTransactionSlice(state), groupId, transactionId })
    );

    return (
        <>
            <MobilePaper>
                <TransactionActions groupId={groupId} transactionId={transactionId} />
                <Divider sx={{ marginBottom: 1, marginTop: 1 }} />
                <Grid container>
                    <Grid item xs={12} md={transaction.isWip || hasAttachments ? 6 : 12}>
                        <TransactionDescription groupId={groupId} transactionId={transactionId} />
                        <TransactionBilledAt groupId={groupId} transactionId={transactionId} />

                        <TransactionCreditorShare
                            groupId={groupId}
                            transactionId={transactionId}
                            isEditing={transaction.isWip}
                            label="Paid by"
                        />

                        <TransactionValue groupId={groupId} transactionId={transactionId} />
                    </Grid>

                    {(transaction.isWip || hasAttachments) && (
                        <Grid item xs={12} md={6} sx={{ marginTop: { xs: 1 } }}>
                            <FileGallery groupId={groupId} transactionId={transactionId} />
                        </Grid>
                    )}
                    <Grid item xs={12}>
                        {transaction.isWip ? (
                            <PurchaseDebitorShares
                                groupId={groupId}
                                transactionId={transactionId}
                                showPositions={showPositions}
                            />
                        ) : (
                            <PurchaseDebitorSharesReadOnly groupId={groupId} transactionId={transactionId} />
                        )}
                    </Grid>
                </Grid>
            </MobilePaper>

            {!showPositions && transaction.isWip && !hasPositions ? (
                <Grid container justifyContent="center" sx={{ marginTop: 2 }}>
                    <Button startIcon={<Add />} onClick={() => setShowPositions(true)}>
                        Add Positions
                    </Button>
                </Grid>
            ) : (showPositions && transaction.isWip) || hasPositions ? (
                <TransactionPositions groupId={groupId} transactionId={transactionId} />
            ) : null}
        </>
    );
};

export default PurchaseDetails;
